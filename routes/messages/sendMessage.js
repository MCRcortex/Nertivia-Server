const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Channels = require("../../models/channels");
const Notifications = require("./../../models/notifications");


module.exports = async (req, res, next) => {
  const { channelID } = req.params;
  const { tempID, message, socketID } = req.body;

  if (!message || message.trim() === "") return next();

  if (message.length > 5000) {
    return res.status(403).json({
      status: false,
      message: "Message must contain characters less than 5,000"
    });
  }

  const messageCreate = new Messages({
    channelID,
    message,
    creator: req.user._id,
    messageID: "placeholder"
  });

  let messageCreated = await messageCreate.save();

  const user = {
    uniqueID: req.user.uniqueID,
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    admin: req.user.admin
  };
  messageCreated = {
    channelID,
    message,
    creator: user,
    created: messageCreated.created,
    messageID: messageCreated.messageID
  };

  res.json({
    status: true,
    tempID,
    messageCreated
  });

  req.message_status = true;
  req.message_id = messageCreated.messageID;
  next();

  // emit
  const io = req.io;

  if (req.channel.server) {
    return serverMessage();
  } else {
    return directMessage();
  }

  async function serverMessage() {
    const clients =
      io.sockets.adapter.rooms["server:" + req.channel.server.server_id]
        .sockets;
    for (let clientId in clients) {
      if (clientId !== socketID) {
        io.to(clientId).emit("receiveMessage", {
          message: messageCreated
        });
      }
    }

    //send notification
    //find all members in the server.
    const members = await ServerMembers.find({
      server: req.channel.server._id
    }).populate("member");

    const members_uniqueID = members
      .map(m => m.member.uniqueID)
      .filter(m => m !== req.user.uniqueID);

    let notificationPromises = [];
    for await (const memberUniqueID of members_uniqueID) {
      const sendNotificaiton = Notifications.findOneAndUpdate(
        {
          recipient: memberUniqueID,
          channelID
        },
        {
          $set: {
            recipient: memberUniqueID,
            channelID,
            type: "MESSAGE_CREATED",
            lastMessageID: messageCreated.messageID,
            sender: req.user._id
          },
          $inc: {
            count: 1
          }
        },
        {
          upsert: true
        }
      );
      notificationPromises.push(sendNotificaiton);
    }
    await Promise.all(notificationPromises);

    return;
  }

  async function directMessage() {
    // for group messaging, do a loop instead of [0]
    io.in(req.channel.recipients[0].uniqueID).emit("receiveMessage", {
      message: messageCreated
    });

    // Loop for other users logged in to the same account and emit (exclude the sender account.).
    //TODO: move this to client side for more performance.
    const rooms = io.sockets.adapter.rooms[req.user.uniqueID];
    if (rooms)
      for (let clientId in rooms.sockets || []) {
        if (clientId !== socketID) {
          io.to(clientId).emit("receiveMessage", {
            message: messageCreated,
            tempID
          });
        }
      }

    //change lastMessage timeStamp
    const updateChannelTimeStap = Channels.updateMany(
      {
        channelID
      },
      {
        $set: {
          lastMessaged: Date.now()
        }
      },
      {
        upsert: true
      }
    );

    // sends notification to a user.
    const sendNotificaiton = Notifications.findOneAndUpdate(
      { recipient: req.channel.recipients[0].uniqueID, channelID },
      {
        $set: {
          recipient: req.channel.recipients[0].uniqueID,
          channelID,
          type: "MESSAGE_CREATED",
          lastMessageID: messageCreated.messageID,
          sender: req.user._id
        },
        $inc: {
          count: 1
        }
      },
      { upsert: true }
    );

    await Promise.all([updateChannelTimeStap, sendNotificaiton]);
  }
};