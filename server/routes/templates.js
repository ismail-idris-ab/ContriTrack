const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const Template = require('../models/Template');
const { protect, softProtect } = require('../middleware/auth');

// GET /api/templates — system presets + caller's saved templates
router.get('/', softProtect, async (req, res) => {
  try {
    const presets = await Template.find({ isPreset: true }).sort({ createdAt: 1 });
    const mine = req.user
      ? await Template.find({ createdBy: req.user._id, isPreset: false }).sort({ createdAt: -1 })
      : [];
    res.json({ presets, mine });
  } catch (err) {
    console.error('[templates]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/templates/:id — owner only, cannot delete presets
router.delete('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (template.isPreset) return res.status(403).json({ message: 'System templates cannot be deleted' });
    if (String(template.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own templates' });
    }
    await template.deleteOne();
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('[templates]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/templates/:id — rename/re-describe a saved template (owner only)
router.patch('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (template.isPreset)
      return res.status(403).json({ message: 'System templates cannot be edited' });
    if (String(template.createdBy) !== String(req.user._id))
      return res.status(403).json({ message: 'You can only edit your own templates' });

    const name        = String(req.body.name        || '').replace(/<[^>]*>/g, '').trim();
    const description = String(req.body.description ?? template.description).replace(/<[^>]*>/g, '').trim();

    if (!name) return res.status(400).json({ message: 'Template name is required' });
    if (name.length > 80)
      return res.status(400).json({ message: 'Name must be 80 characters or fewer' });
    if (description.length > 200)
      return res.status(400).json({ message: 'Description must be 200 characters or fewer' });

    template.name        = name;
    template.description = description;
    await template.save();

    res.json(template);
  } catch (err) {
    console.error('[templates]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
