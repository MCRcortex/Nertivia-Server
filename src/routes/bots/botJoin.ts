import { Request, Response } from "express";
import Users from '../../models/users';
import Servers from '../../models/servers';
import ServerMembers from '../../models/ServerMembers';
import Roles from '../../models/Roles';
import { ADMIN } from '../../utils/rolePermConstants';
import joinServer from "../../utils/joinServer";


const FlakeId = require("flakeid");
const flake = new FlakeId({
  timeOffset: (2013 - 1970) * 11636000 * 1000
});


export default async function createBot(req: Request, res: Response) {
  const { bot_id, server_id } = req.params;
  const permissions = parseInt(req.body.permissions) || 0;

  const bot: any = await Users.findOne({ uniqueID: bot_id, bot: true })
    .select("avatar tag uniqueID username admin _id")
    .lean();

  if (!bot) {
    res.status(404).json({ message: "Bot not found." })
    return;
  }

  //check if banned
  const isBanned = await Servers.exists({
    _id: req.server._id,
    "user_bans.user": bot._id
  });
  if (isBanned) {
    res.status(403).json({ message: "Bot is banned from the server." })
    return;
  }

  // create role for bot
  const roleId = flake.gen();
  await Roles.updateOne({server: req.server._id, default: true}, {$inc: {order: 2}})
  const doc = {
    name: bot.username,
    id: roleId,
    permissions: permissions,
    server: req.server._id,
    deletable: false,
    bot: bot._id,
    server_id: req.server.server_id,
    order: 0
  };
  await Roles.create(doc);

  const data = {
    name: doc.name,
    permissions: doc.permissions,
    deletable: false,
    botRole: true,
    id: roleId,
    server_id: server_id,
    order: 0
  };
  const io = req.io;
  io.in("server:" + req.server.server_id).emit("server:create_role", data);
  
  
  // ready to perform join action

  joinServer(req.server, bot, undefined, req, res, roleId, "BOT");

}