// READ-ONLY connection to the existing OsonMenu database.
// Never call .save(), .create(), .updateOne(), .deleteOne(), etc. on models
// bound to this connection — this database belongs to the OsonMenu project.
import mongoose from "mongoose";

declare global {
  var __osonmenuConn: Promise<mongoose.Connection> | undefined;
}

export function connectToOsonMenuDB(): Promise<mongoose.Connection> {
  if (!global.__osonmenuConn) {
    const uri = process.env.OSONMENU_MONGODB_URI;
    if (!uri) throw new Error("OSONMENU_MONGODB_URI is not set");

    global.__osonmenuConn = mongoose
      .createConnection(uri, {
        dbName: process.env.OSONMENU_DB_NAME ?? "osonmenu",
      })
      .asPromise()
      .then((conn) => {
        console.log("[OsonMenu DB] Connected (READ ONLY)");
        return conn;
      });
  }
  return global.__osonmenuConn;
}
