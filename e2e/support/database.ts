import bcryptjs from "bcryptjs";
import { MongoClient } from "mongodb";

import { DATABASE_NAME, MONGODB_URI } from "./environment";

type SeedUser = { email: string; password: string };

export const seedActiveUser = async ({ email, password }: SeedUser): Promise<void> => {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const users = client.db(DATABASE_NAME).collection("users");
    const username = email.split("@", 1)[0] ?? email;

    await users.deleteMany({ email });
    await users.insertOne({
      email,
      password: bcryptjs.hashSync(password, 10),
      username,
      displayName: username,
      avatar: null,
      role: "client",
      isActive: true,
      verifyToken: null,
      verifyTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: null,
      _destroy: false,
    });
  } finally {
    await client.close();
  }
};
