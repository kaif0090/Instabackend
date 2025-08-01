// videoModel.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  des: { type: String, required: true }, // corrected 'require' to 'required'
  file: { type: String, required: true } // corrected 'require' to 'required'
}, { timestamps: true }); // ✅ Add this as an options object

module.exports = mongoose.model("Reel", videoSchema);
