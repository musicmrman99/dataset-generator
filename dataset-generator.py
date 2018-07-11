# NOTE: use sqlite3
# NOTE: use sqlalchemy?

import flask
app = flask.Flask(__name__)


@app.route("/")
def index():
    return flask.render_template("index.html", version='0.1')


if __name__ == "__main__":
    app.run(port=5000)
