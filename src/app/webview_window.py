from PySide6.QtCore import QUrl
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QVBoxLayout, QWidget


class WebsiteWindow(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Website")
        self.resize(1100, 800)

        layout = QVBoxLayout(self)
        self.web_view = QWebEngineView(self)
        self.web_view.load(QUrl("https://big-brother-five.vercel.app/"))
        layout.addWidget(self.web_view)
