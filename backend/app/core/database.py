import os
from motor.motor_asyncio import AsyncIOMotorClient

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    name = os.getenv("DB_NAME", "alertdrive_drowsiness")
    client = AsyncIOMotorClient(uri)
    db = client[name]

    await db.users.create_index("email", unique=True)
    await db.sessions.create_index("user_id")
    await db.sessions.create_index("started_at")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
