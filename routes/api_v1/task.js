const router = require("express").Router();
const Project = require("../../models/Project");
const Task = require("../../models/Task");
const Attachment = require("../../models/Attachment");
const Comment = require("../../models/Comment");
const Todo = require("../../models/Todo");
const auth = require("../auth");
const { getNotNullFields, getFileName } = require("../../utils");
const { upload, getImageName } = require("../../config/storage");
const s3 = require("../../config/s3");
const mongoose = require("mongoose");
const settings = require("../../models/settings");
const cron = require('node-cron');
const moment = require("moment");
const { sendNotification } = require('../../config/notification');

const create = async (req, res, next) => {
  try {
    const { title, project, board, order } = req.body;
    const task = new Task({ title, board, order });
    await task.save();
    await Project.updateOne(
      { _id: project },
      {
        $push: {
          tasks: task._id,
          history: { title: `"${title.substring(0, 10)}" task has created.` }
        }
      }
    );
    res.status(200).json(task);
  } catch (e) {
    next(e);
  }
};

const get = async (req, res, next) => {
  try {
    const data = await Promise.all([
      Task.findOne({ _id: req.params.id })
        .populate("attachments")
        .populate("todoGroup.list")
        .populate("members", "firstName , lastName , avatar")
        .populate("attachments", "type , src , name , size")
        .populate({
          path: "comments",
          populate: [
            { path: "user", select: { firstName: 1, lastName: 1, avatar: 1 } },
            {
              path: "attachments",
              select: { src: 1, type: 1, name: 1, size: 1 }
            }
          ]
        })
    ]);
    res.status(200).json({ ...data[0].toJSON() });
  } catch (e) {
    next(e);
  }
};

const update = async (req, res, next) => {
  try {
    const {
      title,
      desc,
      board,
      order,
      endDate,
      members,
      tags,
      archived,
      startDate,
      missionType,
      location,
      repitition
    } = req.body;
    console.log(req.body);
    const data = getNotNullFields({
      title,
      board,
      order,
      endDate,
      tags,
      archived,
      desc,
      startDate,
      missionType,
      location
    });
    if (Array.isArray(tags) && tags.length === 0) data["tags"] = [];
    if (Array.isArray(members)) data["members"] = members;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id },
      { $set: data },
      { new: true }
    );
    if (!location) {
      await Task.findOneAndUpdate(
        { _id: req.params.id },
        { $unset: { location: 1 } }
      );
    }
    if (repitition) {
      const { day, every, type } = req?.body;
      const { id, project } = req?.body;
      if (parseInt(type) == 1) {
        await Task.findOneAndUpdate(
          { _id: req.params.id },
          { $set: { repitition: `every ${every} day` } },
          { new: true }
        );
        cron.schedule(`0 0 12 */${every} *`, async () => {
          await repeatTask(req.params.id, project);
        });
      }
      if (parseInt(type) == 2) {
        await Task.findOneAndUpdate(
          { _id: req.params.id },
          { $set: { repitition: `every ${every} month` } },
          { new: true }
        );
        cron.schedule(`0 0 12 ${day} */${every}`, async () => {
          await repeatTask(req.params.id, project);
        });
      }
      if (parseInt(type) == 3) {
        await Task.findOneAndUpdate(
          { _id: req.params.id },
          { $set: { repitition: `every ${every} week` } },
          { new: true }
        );
        cron.schedule(`0 0 12 */${every} ${day}`, async () => {
          await repeatTask(req.params.id, project);
        });
      }

      if (parseInt(type) == 4) {
        await Task.findOneAndUpdate(
          { _id: req.params.id },
          { $set: { repitition: `every ${every} year` } },
          { new: true }
        );
        const date = day ? new Date(day) : new Date();
        cron.schedule(
          `0 0 12 ${day.getMonth() + 1} ${day.getDate()} */${every}`,
          async () => {
            await repeatTask(req.params.id, project);
          }
        );
      }

      if (parseInt(type) == 5) {
        const task = await Task.findOneAndUpdate(
          { _id: req.params.id },
          { $set: { repitition: `every ${every} day` } },
          { new: true }
        );
        cron.schedule(`*/3 * * * * *`, async () => {
          await repeatTask(req.params.id, project);
        });
      }
    }

    if (req?.body?.reminder) {
      const { remindType, remindDateType } = req?.body;
      const taskData = await Task.findOne(
        { _id: req.params.id });
      const { startDate, endData } = taskData;
      let dateScheduing = 0;
      let timeToo = 0;
      if (remindDateType == "1") {
        if (startDate) {
          if (remindType == "1") {
            dateScheduing = new Date(startDate.getTime() - 5 * 60 * 1000)
            timeToo = "5 Minutes";
          } else if (remindType == "2") {
            dateScheduing = new Date(startDate.getTime() - 10 * 60 * 1000)
            timeToo = "10 Minutes";
          } else if (remindType == "3") {
            dateScheduing = new Date(startDate.getTime() - 15 * 60 * 1000)
            timeToo = "15 Minutes";
          } else if (remindType == "4") {
            dateScheduing = new Date(startDate.getTime() - 30 * 60 * 1000)
            timeToo = "30 Minutes";
          } else if (remindType == "5") {
            dateScheduing = new Date(startDate.getTime() - 1 * 60 * 60 * 1000)
            timeToo = "1 Hour";
          } else if (remindType == "6") {
            dateScheduing = new Date(startDate.getTime() - 2 * 60 * 60 * 1000)
            timeToo = "2 Hours";
          } else if (remindType == "7") {
            dateScheduing = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000)
            timeToo = "1 Day";
          } else if (remindType == "8") {
            dateScheduing = new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000)
            timeToo = "2 Days";
          }
          const cronSchedulePattern = `${dateScheduing.getMinutes()} ${dateScheduing.getHours()} ${dateScheduing.getDate()} ${dateScheduing.getMonth() + 1
            } * *`;
          cron.schedule(cronSchedulePattern, async () => {
            if (taskData.members.length)
              taskData.members.map(async item => {
                await sendNotification("Task will start in" + timeToo, item?.id);
              })
          });

        } else if (remindDateType == "2") {
          if (endDate) {
            if (remindType == "1") {
              dateScheduing = new Date(endDate.getTime() - 5 * 60 * 1000)
              timeToo = "5 Minutes";
            } else if (remindType == "2") {
              dateScheduing = new Date(endDate.getTime() - 10 * 60 * 1000)
              timeToo = "10 Minutes";
            } else if (remindType == "3") {
              dateScheduing = new Date(endDate.getTime() - 15 * 60 * 1000)
              timeToo = "15 Minutes";
            } else if (remindType == "4") {
              dateScheduing = new Date(endDate.getTime() - 30 * 60 * 1000)
              timeToo = "30 Minutes";
            } else if (remindType == "5") {
              dateScheduing = new Date(endDate.getTime() - 1 * 60 * 60 * 1000)
              timeToo = "1 Hour";
            } else if (remindType == "6") {
              dateScheduing = new Date(endDate.getTime() - 2 * 60 * 60 * 1000)
              timeToo = "2 Hours";
            } else if (remindType == "7") {
              dateScheduing = new Date(endDate.getTime() - 1 * 24 * 60 * 60 * 1000)
              timeToo = "1 Day";
            } else if (remindType == "8") {
              dateScheduing = new Date(endDate.getTime() - 2 * 24 * 60 * 60 * 1000)
              timeToo = "2 Days";
            }

          }
          const cronSchedulePattern = `${dateScheduing.getMinutes()} ${dateScheduing.getHours()} ${dateScheduing.getDate()} ${dateScheduing.getMonth() + 1
            } * *`;
          cron.schedule(cronSchedulePattern, async () => {
            if (taskData.members.length)
              taskData.members.map(async item => {
                await sendNotification("Task will ended in" + timeToo, item?.id);
              })
          });
        } else {
          return;
        }
      }
    }
    res.status(200).json(task);
  } catch (e) {
    next(e);
  }
};

const repeatTask = async (id, project) => {
  const duplicateItem = await Task.findOne(
    { _id: id },
    {
      comments: 0,
      todoGroup: 0,
      archived: 0,
      _id: 0,
      createdAt: 0
    }
  );
  const _id = new mongoose.Types.ObjectId();
  const item = { ...duplicateItem._doc, _id, board: 1 };
  const a = await Task.create(item);
  await Project.updateOne({ _id: project }, { $push: { tasks: _id } });
};

const removeStartDate = async (req, res, next) => {
  try {
    const up = await Task.update(
      { _id: req.params.id },
      { $unset: { startDate: 1 } }
    );
    console.log(up);
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const removeRepition = async (req, res, next) => {
  try {
    const up = await Task.update(
      { _id: req.params.id },
      { $unset: { repitition: 1 } }
    );
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const removeEndDate = async (req, res, next) => {
  // console.log(req);
  try {
    await Task.findOneAndUpdate(
      { _id: req.params.id },
      { $unset: { endDate: 1 } }
    );
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
    console.log(e);
  }
};

const changeSettings = async (req, res, next) => {
  // console.log(req?.body?.tasks?.active);
  try {
    await settings.findOneAndUpdate(
      { _id: "652e999b1b2dc62d7a7d6331" },
      { $set: { active: req?.body?.tasks?.active } }
    );
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
    console.log(e);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const setting = await settings.findById({
      _id: "652e999b1b2dc62d7a7d6331"
    });
    console.log(setting);
    res.status(200).json({ setting });
  } catch (e) {
    console.log(e);
    next(e);
  }
};

const updateMultiple = async (req, res, next) => {
  try {
    const { tasks } = req.body;
    const reqs = [];
    tasks.map((t) => t._id);
    tasks.forEach((item) =>
      reqs.push(
        Task.updateOne({ _id: item._id }, { $set: getNotNullFields(item) })
      )
    );
    await Promise.all(reqs);
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const duplicate = async (req, res, next) => {
  try {
    const duplicateItem = await Task.findOne(
      { _id: req.params.id },
      { comments: 0, todoGroup: 0, archived: 0, _id: 0, createdAt: 0 }
    );
    const _id = new mongoose.Types.ObjectId();
    const item = { ...duplicateItem._doc, _id };
    const a = await Task.create(item);
    await Project.updateOne(
      { _id: req.body.project },
      { $push: { tasks: _id } }
    );
    res.status(200).json(a);
  } catch (e) {
    next(e);
  }
};

const uploadFiles = async (req, res, next) => {
  try {
    const requests = [];
    const newReq = [];
    for (const file of req.files) {
      requests.push(s3.upload(file, "attachment", getImageName(file)));
    }
    const uploadedFiles = await Promise.all(requests);
    uploadedFiles.forEach((file, index) => {
      const { mimetype, size, filename } = req.files[index];
      newReq.push(
        new Attachment({
          src: file.key,
          type: mimetype,
          size,
          name: getFileName(filename)
        }).save()
      );
    });
    const savedAttachments = await Promise.all(newReq);
    await Task.updateOne(
      { _id: req.params.id },
      { $push: { attachments: savedAttachments.map((a) => a._id) } }
    );
    res
      .status(200)
      .json({ task: req.params.id, uploadedAttachments: savedAttachments });
  } catch (e) {
    next(e);
  }
};

const removeAttachment = async (req, res, next) => {
  try {
    const file = await Attachment.findOne({ _id: req.params.file }, { src: 1 });
    await Promise.all([
      Task.updateOne(
        { _id: req.params.id },
        { $pull: { attachments: req.params.file } }
      ),
      Attachment.deleteOne({ _id: req.params.file }),
      s3.remove(file.src)
    ]);
    res.send({ deletedFile: file._id });
  } catch (e) {
    next(e);
  }
};

const createTodoGroup = async (req, res, next) => {
  try {
    const _id = new mongoose.Types.ObjectId();
    const data = { _id, title: req.body.title, list: [] };
    await Task.updateOne(
      { _id: req.params.id },
      { $push: { todoGroup: data } }
    );
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};

const updateTodoGroup = async (req, res, next) => {
  try {
    await Task.updateOne(
      { _id: req.params.id, "todoGroup._id": req.params.todoGroup },
      { $set: { "todoGroup.$.title": req.body.title } }
    );
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const newTodo = async (req, res, next) => {
  try {
    const todo = await new Todo({ text: req.body.text }).save();
    await Task.updateOne(
      { _id: req.params.id, "todoGroup._id": req.params.todoGroup },
      { $push: { "todoGroup.$.list": todo._id } }
    );
    res.status(200).json(todo);
  } catch (e) {
    next(e);
  }
};

const deleteTodo = async (req, res, next) => {
  try {
    await Promise.all([
      Todo.deleteOne({ _id: req.params.todo }),
      Task.updateOne(
        { _id: req.params.id, "todoGroup.list._id": req.params.todo },
        { $pull: { "todoGroup.list.$": req.params.todo } }
      )
    ]);
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const deleteTodoGroup = async (req, res, next) => {
  try {
    const todoGroup = (
      await Task.findOne({ _id: req.params.id })
    ).todoGroup.find((t) => t._id == req.params.todoGroup);
    await Promise.all([
      ...todoGroup.list.map((t) => Todo.deleteOne({ _id: t })),
      Task.updateOne(
        { _id: req.params.id },
        { $pull: { todoGroup: { _id: req.params.todoGroup } } }
      )
    ]);
    res.send({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

const remove = async (req, res, next) => {
  try {
    const tasks = await Task.find({ _id: { $in: req.body.tasks } });
    const todos = tasks
      .map((task) => task.todoGroup?.map((group) => group.list.map((t) => t)))
      .flat()
      .flat();
    const comments = tasks.map((task) => task.comments).flat();
    const attachments = tasks.map((task) => task.attachments).flat();
    await Task.deleteMany({ _id: { $in: req.body.tasks } });
    await Promise.all([
      Todo.deleteMany({ _id: { $in: todos } }),
      Comment.deleteMany({ _id: { $in: comments } }),
      Attachment.deleteMany({ _id: { $in: attachments } }),
      Task.deleteMany({ _id: { $in: tasks.map((t) => t._id) } }),
      Project.updateOne(
        { tasks: { $in: req.body.tasks } },
        { $pull: { tasks: { $in: req.body.tasks } } }
      )
    ]);
    res.status(200).json({ ok: 1 });
  } catch (e) {
    next(e);
  }
};

router.post("/", auth.required, create);
router.get("/:id", auth.required, get);
router.put("/:id", auth.required, update);
router.post("/:id/duplicate", auth.required, duplicate);
router.put("/update/multi", auth.required, updateMultiple);
router.put("/:id/file", [auth.required, upload.array("file")], uploadFiles);
router.put("/:id/removeEndDate", auth.required, removeEndDate);
router.put("/:id/removeStartDate", auth.required, removeStartDate);
router.put("/:id/removeRepition", auth.required, removeRepition);
// removeRepition
router.put("/:id/todoGroup", auth.required, createTodoGroup);
router.put("/:id/todoGroup/:todoGroup", auth.required, updateTodoGroup);
router.put("/:id/newTodo/:todoGroup", auth.required, newTodo);
router.delete("/:id/todoGroup/:todoGroup", auth.required, deleteTodoGroup);
router.delete("/:id/todo/:todo", auth.required, deleteTodo);
router.delete("/:id/file/:file", auth.required, removeAttachment);
router.put("/delete/tasks", auth.required, remove);
router.post("/changeSettings", auth.required, changeSettings);
router.post("/getSettings", auth.required, getSettings);
// changeSettings

module.exports = router;
