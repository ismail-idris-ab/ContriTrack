const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { guardGroupCreate, guardMemberAdd } = require('../middleware/planGuard');
const validate = require('../middleware/validate');
const {
  createGroupSchema, joinGroupSchema, updateGroupSchema,
  updateSettingsSchema, updateMemberRoleSchema, saveTemplateSchema,
} = require('../validators/groups');
const ctrl = require('../controllers/groupsController');

router.post('/',                          protect, guardGroupCreate,                  validate(createGroupSchema),     ctrl.createGroup);
router.get('/mine',                       protect,                                                                      ctrl.getMyGroups);
router.post('/join',                      protect, ctrl.resolveGroup, guardMemberAdd, validate(joinGroupSchema),        ctrl.joinGroup);
router.get('/:id',                        protect,                                                                      ctrl.getGroup);
router.get('/:id/members',               protect,                                                                      ctrl.getGroupMembers);
router.patch('/:id/members/:userId/role', protect, validate(updateMemberRoleSchema),                                   ctrl.updateMemberRole);
router.patch('/:id',                      protect, validate(updateGroupSchema),                                         ctrl.updateGroup);
router.patch('/:id/settings',             protect, validate(updateSettingsSchema),                                      ctrl.updateGroupSettings);
router.post('/:id/save-template',         protect, validate(saveTemplateSchema),                                        ctrl.saveTemplate);
router.delete('/:id',                     protect,                                                                      ctrl.archiveGroup);
router.delete('/:id/members/:userId',     protect,                                                                      ctrl.removeMember);

module.exports = router;
