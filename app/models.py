from . import db
from flask_login import UserMixin
from datetime import datetime


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    password = db.Column(db.String(300), nullable=False)
    bio = db.Column(
        db.String(500), default="Hey there! I am using Hi-Meeting-APP.")
    avatar = db.Column(db.String(150), default="default.png")


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room = db.Column(db.String(50), nullable=False)
    sender_username = db.Column(db.String(150), nullable=False)
    content = db.Column(db.Text, nullable=False)
    msg_type = db.Column(db.String(10), default='text')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
