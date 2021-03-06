const PublicThemes = require("../../models/publicThemes");

module.exports = async (req, res, next) => {
  const themes = await PublicThemes.find({$or: [{approved: false}, {updatedCss: {$exists: true}}] }, {_id: 0}).select('id description screenshot theme stars approved').populate('theme', ' -_id name id');
  res.json(themes);
};

