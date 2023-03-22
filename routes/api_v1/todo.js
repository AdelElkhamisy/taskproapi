const router = require("express").Router();
const Todo = require("../../models/Todo");
const User = require("../../models/User");
const Task = require("../../models/Task");
const mongoose = require("mongoose");

const auth = require("../auth");
const { getNotNullFields } = require("../../utils");
const { json } = require("express");

const create = async (req, res, next) => {
  try {
    const { text, project } = req.body;
    const data = { text };
    if (project) data.project = project;
    else data.user = req.payload.id;
    const todo = new Todo(data);
    await todo.save();
    res.status(200).json(todo);
  } catch (e) {
    next(e);
  }
};

const getOfProject = async (req, res, next) => {
  try {
    const todo = await Todo.find({ project: req.params.id });
    res.status(200).json(todo);
  } catch (e) {
    next(e);
  }
};

const getOfUser = async (req, res, next) => {
  try {
    const todo = await Todo.find({ user: req.payload.id });
    res.status(200).json(todo);
  } catch (e) {
    next(e);
  }
};

const update = async (req, res, next) => {
  try {
    const { text, checked } = req.body;
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id },
      { $set: getNotNullFields({ text, checked }) },
      { new: true }
    );
    res.status(200).json(todo);
  } catch (e) {
    next(e);
  }
};

const remove = async (req, res, next) => {
  try {
    await Todo.deleteOne({ _id: req.params.id });
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const testCamp = async (req, res) => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.drop();
  }
  // try {
  //   await Todo.remove()
  //   await User.remove()
  //   res.status(200).json({ ok: 1 });
  // } catch (e) {
  //   next(e);
  // }
};

router.post("/", auth.required, create);
router.get("/project/:id", auth.required, getOfProject);
router.get("/user", auth.required, getOfUser);
router.put("/:id", auth.required, update);
router.delete("/:id", auth.required, remove);
router.get("/testCamp", testCamp);

module.exports = router;
