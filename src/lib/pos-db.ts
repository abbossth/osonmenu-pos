// Read/write connection to the POS's own database (osonmenu_pos).
import mongoose from "mongoose";

declare global {
  var __posConn: Promise<mongoose.Connection> | undefined;
}

export function connectToPosDB(): Promise<mongoose.Connection> {
  if (!global.__posConn) {
    const uri = process.env.POS_MONGODB_URI;
    if (!uri) throw new Error("POS_MONGODB_URI is not set");

    global.__posConn = mongoose
      .createConnection(uri, {
        dbName: process.env.POS_DB_NAME ?? "osonmenu_pos",
      })
      .asPromise()
      .then((conn) => {
        console.log("[POS DB] Connected");
        return conn;
      });
  }
  return global.__posConn;
}
