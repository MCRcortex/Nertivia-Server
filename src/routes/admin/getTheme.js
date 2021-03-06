const PublicThemes = require("../../models/publicThemes");

module.exports = async (req, res, next) => {
  const { id } = req.params;
  const themes = await PublicThemes.findOne({id: id}).select('id description screenshot theme stars approved css updatedCss').populate('theme', ' -_id name id');
  res.json(themes);
};

