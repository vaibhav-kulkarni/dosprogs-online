const mongo = require("../db/mongo");

module.exports.getPrograms = async function () {
  const collection = mongo.db.collection("programs");
  return await collection.find({}).project({ text: 0 }).toArray();
};

module.exports.createProgram = async function (program) {
  if (!/^[a-zA-Z0-9-_]{1,18}\.[cC]([pP][pP])?$/i.test(program.name)) {
    throw new Error("Invalid program name.")
  }
  program.name = program.name.toLowerCase();
  const collection = mongo.db.collection("programs");
  if ((await collection.countDocuments({ name: program.name })) > 0) {
    throw new Error("Program with this name already exists");
  }
  return await collection.insertOne(program);
};

module.exports.updateProgram = async function (programName, program) {
  // TODO validations
  const collection = mongo.db.collection("programs");
  const response = await collection.findOneAndUpdate(
    { name: programName },
    { $set: program }
  );
  const { updatedExisting } = response.lastErrorObject;
  if (!updatedExisting) {
    throw new Error("Program with this name does not exist");
  }
  return { updatedExisting };
};

module.exports.getProgram = async function (programName) {
  // TODO validations
  const collection = mongo.db.collection("programs");
  const response = await collection.findOne({ name: programName });
  if (!response) {
    throw new Error("Program with this name does not exist");
  }
  return response;
};

module.exports.deleteProgram = async function (programName) {
  // TODO validations
  const collection = mongo.db.collection("programs");
  const response = await collection.findOneAndDelete({ name: programName });
  if (response.value == null) {
    throw new Error("Program with this name does not exist");
  }
  return { value: response.value };
};
