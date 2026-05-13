const Group = require('../models/Group');
const Contribution = require('../models/Contribution');
const Template = require('../models/Template');
const { logAudit } = require('../utils/audit');
const { send, fail } = require('../utils/response');

function isGroupAdmin(group, userId) {
  const m = group.members.find(m => String(m.user?._id ?? m.user) === String(userId));
  return m?.role === 'admin';
}

function isGroupMember(group, userId) {
  return group.members.some(m => String(m.user?._id ?? m.user) === String(userId));
}

async function createGroup(req, res) {
  const {
    name, description, contributionAmount, dueDay, graceDays, rotationType,
    contributionFrequency, startDate, cyclesPerMonth,
    dueDayOfWeek, dueDayOfMonth, dueMonth,
  } = req.body;
  const safeDescription = description
    ? String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : '';
  try {
    const group = await Group.create({
      name: name.trim().slice(0, 100), description: safeDescription,
      contributionAmount: Number(contributionAmount) || 0,
      dueDay, graceDays, rotationType,
      ...(contributionFrequency && { contributionFrequency }),
      ...(startDate             && { startDate }),
      ...(cyclesPerMonth        && { cyclesPerMonth: Number(cyclesPerMonth) }),
      ...(dueDayOfWeek  != null && dueDayOfWeek  !== '' && { dueDayOfWeek:  Number(dueDayOfWeek) }),
      ...(dueDayOfMonth != null && dueDayOfMonth !== '' && { dueDayOfMonth: Number(dueDayOfMonth) }),
      ...(dueMonth      != null && dueMonth      !== '' && { dueMonth:      Number(dueMonth) }),
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    await group.populate('members.user', 'name email role');
    send(res, group, 201);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function getMyGroups(req, res) {
  try {
    const groups = await Group.find({ 'members.user': req.user._id, isActive: true })
      .populate('members.user', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    send(res, groups);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function resolveGroup(req, res, next) {
  const { inviteCode } = req.body;
  if (!inviteCode || !inviteCode.trim()) {
    return fail(res, 'Invite code is required', 400);
  }
  try {
    const group = await Group.findOne({ inviteCode: inviteCode.trim().toUpperCase(), isActive: true });
    if (!group) return fail(res, 'Invalid invite code — group not found', 404);

    if (isGroupMember(group, req.user._id)) {
      return fail(res, 'You are already a member of this group', 400);
    }

    req.resolvedGroup = group;
    next();
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function joinGroup(req, res) {
  try {
    const group = req.resolvedGroup;
    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'name email role');
    logAudit({
      action: 'member.added', adminId: req.user._id, groupId: group._id,
      entityType: 'User', entityId: req.user._id, targetUserId: req.user._id,
      meta: { role: 'member', via: 'invite_code' },
    });
    send(res, group);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function getGroup(req, res) {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email role')
      .populate('createdBy', 'name email');

    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (!isGroupMember(group, req.user._id)) return fail(res, 'You are not a member of this group', 403);

    send(res, group);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function getGroupMembers(req, res) {
  const now   = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year  = Number(req.query.year)  || now.getFullYear();

  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email role avatar');

    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (!isGroupMember(group, req.user._id)) return fail(res, 'You are not a member of this group', 403);

    const memberUserIds  = group.members.map(m => m.user._id);
    const contributions  = await Contribution.find({ group: group._id, month, year, user: { $in: memberUserIds } });
    const contribMap     = {};
    contributions.forEach(c => { contribMap[c.user.toString()] = c; });

    const result = group.members.map(m => {
      const uid = m.user._id.toString();
      return {
        _id: m.user._id, name: m.user.name, email: m.user.email,
        avatar: m.user.avatar, groupRole: m.role, joinedAt: m.joinedAt,
        paid: !!contribMap[uid], contribution: contribMap[uid] || null,
      };
    });
    send(res, result);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function updateMemberRole(req, res) {
  const { role } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (!isGroupAdmin(group, req.user._id)) return fail(res, 'Only group admins can change member roles', 403);

    if (group.createdBy.toString() === req.params.userId && role === 'member') {
      return fail(res, 'Cannot demote the group creator', 400);
    }

    const memberEntry = group.members.find(
      m => String(m.user?._id ?? m.user) === String(req.params.userId)
    );
    if (!memberEntry) return fail(res, 'User is not a member of this group', 404);

    const oldRole = memberEntry.role;
    memberEntry.role = role;
    await group.save();
    await group.populate('members.user', 'name email role');

    logAudit({
      action: 'member.role_changed', adminId: req.user._id, groupId: group._id,
      entityType: 'User', entityId: req.params.userId, targetUserId: req.params.userId,
      meta: { oldRole, newRole: role },
    });

    send(res, group);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function updateGroup(req, res) {
  const { name, description, contributionAmount } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (!isGroupAdmin(group, req.user._id)) return fail(res, 'Only group admins can edit group details', 403);

    if (name !== undefined)               group.name               = String(name).trim().slice(0, 100);
    if (description !== undefined)        group.description        = String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    if (contributionAmount !== undefined) group.contributionAmount = Number(contributionAmount);

    await group.save();
    await group.populate([
      { path: 'members.user', select: 'name email role' },
      { path: 'createdBy',    select: 'name email' },
    ]);
    send(res, group);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function updateGroupSettings(req, res) {
  const {
    name, description, contributionAmount, dueDay, graceDays, rotationType,
    contributionFrequency, startDate, cyclesPerMonth,
    dueDayOfWeek, dueDayOfMonth, dueMonth,
  } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (!isGroupAdmin(group, req.user._id)) return fail(res, 'Only group admins can update settings', 403);

    if (name !== undefined)               group.name               = String(name).trim().slice(0, 100);
    if (description !== undefined)        group.description        = String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    if (contributionAmount !== undefined) group.contributionAmount = Number(contributionAmount);
    if (dueDay !== undefined)             group.dueDay             = Number(dueDay);
    if (graceDays !== undefined)          group.graceDays          = Number(graceDays);
    if (rotationType !== undefined)       group.rotationType       = rotationType;
    if (contributionFrequency !== undefined) group.contributionFrequency = contributionFrequency;
    if (startDate !== undefined)          group.startDate          = startDate || null;
    if (cyclesPerMonth !== undefined)     group.cyclesPerMonth     = Number(cyclesPerMonth);
    if (dueDayOfWeek  !== undefined)      group.dueDayOfWeek       = dueDayOfWeek  !== '' ? Number(dueDayOfWeek)  : null;
    if (dueDayOfMonth !== undefined)      group.dueDayOfMonth      = dueDayOfMonth !== '' ? Number(dueDayOfMonth) : null;
    if (dueMonth      !== undefined)      group.dueMonth           = dueMonth      !== '' ? Number(dueMonth)      : null;

    await group.save();

    const auditableFields = [
      'name','description','contributionAmount','dueDay','graceDays','rotationType',
      'contributionFrequency','startDate','cyclesPerMonth','dueDayOfWeek','dueDayOfMonth','dueMonth',
    ];
    logAudit({
      action: 'group.settings_changed', adminId: req.user._id, groupId: group._id,
      entityType: 'Group', entityId: group._id,
      meta: {
        fields: Object.keys(req.body).filter(k => auditableFields.includes(k)),
      },
    });

    await group.populate('members.user', 'name email role');
    send(res, group);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function saveTemplate(req, res) {
  const { name, description, icon } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (!isGroupAdmin(group, req.user._id)) return fail(res, 'Only group admins can save templates', 403);

    const existing = await Template.countDocuments({ createdBy: req.user._id, isPreset: false });
    if (existing >= 10) {
      return fail(res, 'Template limit reached (max 10). Delete one to save a new template.', 400);
    }

    const template = await Template.create({
      name: String(name).trim().slice(0, 80),
      description: description ? String(description).trim().slice(0, 200) : '',
      icon: icon || '◎', isPreset: false, createdBy: req.user._id,
      settings: {
        contributionAmount: group.contributionAmount, dueDay: group.dueDay,
        graceDays: group.graceDays, rotationType: group.rotationType,
      },
    });
    send(res, template, 201);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function archiveGroup(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return fail(res, 'Only the group creator can archive this circle', 403);
    }
    group.isActive = false;
    await group.save();
    send(res, { message: 'Circle archived successfully.' });
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function removeMember(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);

    const isSelf = req.params.userId === req.user._id.toString();
    if (!isSelf && !isGroupAdmin(group, req.user._id)) {
      return fail(res, 'Only group admins can remove members', 403);
    }
    if (group.createdBy.toString() === req.params.userId) {
      return fail(res, 'Cannot remove the group creator', 400);
    }

    group.members = group.members.filter(
      m => String(m.user?._id ?? m.user) !== String(req.params.userId)
    );
    await group.save();
    logAudit({
      action: 'member.removed', adminId: req.user._id, groupId: group._id,
      entityType: 'User', entityId: req.params.userId, targetUserId: req.params.userId,
      meta: { removedBy: isSelf ? 'self' : 'admin' },
    });
    send(res, { message: 'Member removed' });
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

module.exports = {
  createGroup, getMyGroups, resolveGroup, joinGroup, getGroup,
  getGroupMembers, updateMemberRole, updateGroup, updateGroupSettings,
  saveTemplate, archiveGroup, removeMember,
};
