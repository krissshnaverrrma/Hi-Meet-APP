import os
import base64
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_socketio import join_room, emit
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_mail import Message as EmailMessage
from . import db, socketio, mail
from .models import User, Message

main = Blueprint('main', __name__)

online_users = set()


@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        online_users.add(current_user.username)
        emit('update_user_list', list(online_users), broadcast=True)


@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        online_users.discard(current_user.username)
        emit('update_user_list', list(online_users), broadcast=True)


@main.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.chat'))
    return redirect(url_for('main.login'))


@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter(
            (User.username == identifier) | (User.email == identifier)
        ).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('main.chat'))
        flash('Invalid username or password')
    return render_template('login.html')


@main.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        username = request.form.get('username')
        name = request.form.get('name')
        password = request.form.get('password')

        if User.query.filter((User.username == username) | (User.email == email)).first():
            flash('Username or Email already exists')
            return redirect(url_for('main.register'))

        new_user = User(email=email, username=username, name=name,
                        password=generate_password_hash(password, method='scrypt'))
        db.session.add(new_user)
        db.session.commit()

        try:
            msg = EmailMessage("Welcome to Hi-Meeting-APP 🚀",
                               sender=current_app.config['MAIL_USERNAME'], recipients=[email])
            msg.body = (
                f"Dear {name},\n\n"
                "We are thrilled to welcome you to the Hi-Meet community! Your account has been successfully created.\n\n"
                f"Username: {username}\n\n"
                "You can now log in and start connecting with friends in real-time. We hope you enjoy the smooth experience.\n\n"
                "Happy Chatting!\n"
                "The Hi-Meet-APP Team"
            )
            mail.send(msg)
        except Exception as e:
            print(f"Error sending welcome email: {e}")

        login_user(new_user)
        return redirect(url_for('main.chat'))
    return render_template('register.html')


@main.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.login'))


@main.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        identifier = request.form.get('identifier')
        user = User.query.filter((User.email == identifier) | (
            User.username == identifier)).first()
        if user:
            link = url_for('main.recover_password',
                           username=user.username, _external=True)
            msg = EmailMessage(
                "Password Reset Request", sender=current_app.config['MAIL_USERNAME'], recipients=[user.email])
            msg.body = (
                f"Hello {user.name},\n\n"
                "We received a request to reset your Liquid Chat password. "
                "Click the link below to set a new password:\n\n"
                f"{link}\n\n"
                "If you did not request this change, please ignore this email.\n\n"
                "Best regards,\nThe Hi-Meet-APP Team"
            )
            try:
                mail.send(msg)
                flash(f'Reset link sent to {user.email}')
            except Exception as e:
                flash('Error sending email')
        else:
            flash('User not found')
    return render_template('forgot_password.html')


@main.route('/recover-password/<username>', methods=['GET', 'POST'])
def recover_password(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return redirect(url_for('main.login'))
    if request.method == 'POST':
        user.password = generate_password_hash(
            request.form.get('password'), method='scrypt')
        db.session.commit()
        flash('Password updated successfully')
        return redirect(url_for('main.login'))
    return render_template('recover_password.html', username=username)


@main.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)


@main.route('/edit-profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    if request.method == 'POST':
        if request.form.get('remove_avatar') == 'true':
            if current_user.avatar != 'default.png':
                try:
                    os.remove(os.path.join(
                        current_app.config['UPLOAD_FOLDER'], current_user.avatar))
                except:
                    pass
            current_user.avatar = 'default.png'
        else:
            current_user.name = request.form.get('name')
            current_user.bio = request.form.get('bio')
            if 'avatar' in request.files:
                file = request.files['avatar']
                if file and file.filename != '':
                    filename = secure_filename(
                        f"{current_user.username}_{file.filename}")
                    file.save(os.path.join(
                        current_app.config['UPLOAD_FOLDER'], filename))
                    current_user.avatar = filename
        db.session.commit()
        return redirect(url_for('main.profile'))
    return render_template('edit_profile.html', user=current_user)


@main.route('/delete-account')
@login_required
def delete_account():
    user = current_user
    email = user.email
    name = user.name

    try:
        msg = EmailMessage("Account Deletion Confirmation",
                           sender=current_app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = (
            f"Dear {name},\n\n"
            "This email is to confirm that your Hi-Meet-APP account has been permanently deleted as per your request. "  # Fix applied here
            "All your personal data and message history have been removed from our servers.\n\n"
            "We are sorry to see you go. If you ever wish to return, you are always welcome to create a new account.\n\n"
            "Best regards,\nThe Hi-Meet-APP Team"
        )
        mail.send(msg)

        db.session.delete(user)
        db.session.commit()
        logout_user()
        flash('Your account has been successfully deleted. Goodbye!')
    except Exception as e:
        db.session.rollback()
        print(e)

    return redirect(url_for('main.login'))


@main.route('/chat')
@login_required
def chat():
    users = User.query.filter(User.id != current_user.id).all()
    return render_template('chat.html', user=current_user, users=users, online_users=list(online_users))


@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)

    messages = Message.query.filter_by(
        room=room).order_by(Message.timestamp.asc()).all()
    history = [{
        'id': m.id,
        'username': m.sender_username,
        'message': m.content,
        'type': m.msg_type,
        'timestamp': m.timestamp.strftime('%H:%M')
    } for m in messages]

    emit('load_history', history, room=request.sid)


@socketio.on('send_message')
def on_message(data):
    new_msg = Message(room=data['room'], sender_username=data['username'],
                      content=data['message'], msg_type='text')
    db.session.add(new_msg)
    db.session.commit()
    emit('chat_message', {'id': new_msg.id, 'username': data['username'], 'message': data['message'],
         'type': 'text', 'timestamp': new_msg.timestamp.strftime('%H:%M')}, room=data['room'])


@socketio.on('send_image')
def on_image(data):
    try:
        header, encoded = data['image'].split(',', 1)
        filename = f"msg_{data['username']}_{datetime.utcnow().timestamp()}.png"
        with open(os.path.join(current_app.config['UPLOAD_FOLDER'], filename), "wb") as fh:
            fh.write(base64.b64decode(encoded))

        new_msg = Message(
            room=data['room'], sender_username=data['username'], content=filename, msg_type='image')
        db.session.add(new_msg)
        db.session.commit()
        emit('chat_message', {'id': new_msg.id, 'username': data['username'], 'message': filename,
             'type': 'image', 'timestamp': new_msg.timestamp.strftime('%H:%M')}, room=data['room'])
    except Exception as e:
        print(f"Error saving image: {e}")


@socketio.on('send_file')
def on_file(data):
    try:
        header, encoded = data['file'].split(',', 1)
        file_ext = data['fileName'].split('.')[-1]
        timestamp = datetime.utcnow().timestamp()
        safe_filename = f"file_{data['username']}_{timestamp}.{file_ext}"
        save_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'], safe_filename)

        with open(save_path, "wb") as fh:
            fh.write(base64.b64decode(encoded))

        new_msg = Message(
            room=data['room'], sender_username=data['username'], content=safe_filename, msg_type='file')
        db.session.add(new_msg)
        db.session.commit()

        emit('chat_message', {'id': new_msg.id, 'username': data['username'], 'message': safe_filename,
             'originalName': data['fileName'], 'type': 'file', 'timestamp': new_msg.timestamp.strftime('%H:%M')}, room=data['room'])
    except Exception as e:
        print(f"Error saving file: {e}")


@socketio.on('delete_message')
def on_delete(data):
    msg = Message.query.get(data['id'])
    if msg and msg.sender_username == data['username']:
        db.session.delete(msg)
        db.session.commit()
        emit('message_deleted', {'id': data['id']}, room=data['room'])


@socketio.on('clear_history')
def on_clear_history(data):
    room = data['room']
    try:
        Message.query.filter_by(room=room).delete()
        db.session.commit()
        emit('history_cleared', {}, room=room)
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing history: {e}")


@socketio.on('typing')
def on_typing(data): emit('display_typing', {
    'username': data['username']}, room=data['room'], include_self=False)


@socketio.on('stop_typing')
def on_stop(data): emit('hide_typing', {},
                        room=data['room'], include_self=False)


@socketio.on('send_transcript')
def on_transcript(data): emit('receive_transcript', data,
                              room=data['room'], include_self=False)


@socketio.on('send_tts')
def on_tts(data): emit('play_tts', data, room=data['room'], include_self=False)


@socketio.on('signal')
def on_signal(data): emit('signal', data,
                          room=data['room'], include_self=False)
