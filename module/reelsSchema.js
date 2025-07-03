// videoModel.js
const mongoose = require('mongoose');



const videoSchema = new mongoose.Schema({
  des: { type: String, require: true },
  file: { type: String, require: true },
});
module.exports = mongoose.model("Reel", videoSchema);
