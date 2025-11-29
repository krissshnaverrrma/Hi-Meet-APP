try:
    from eventlet import monkey_patch
    monkey_patch()
except ImportError:
    pass
except RuntimeError:
    pass

from app import create_app, socketio

app = create_app()


socketio_app = app

if __name__ == '__main__':
    print("Starting Hi-Meet-APP in development mode...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
