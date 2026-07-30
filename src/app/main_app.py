import sys

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication, QHBoxLayout, QLabel, QPushButton, QStackedWidget, QVBoxLayout, QWidget

from BigBrotherAPIClient import BigBrotherAPIClient
from faceRec import FaceRecWidget
from webview_window import WebsiteWindow


class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Big Brother")
        self.resize(1200, 800)

        # Initialize the API client here so it belongs to the instance ('self')
        self.api_client = BigBrotherAPIClient()

        self.stack = QStackedWidget(self)

        self.home_page = QWidget(self)
        home_layout = QVBoxLayout(self.home_page)
        home_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        title = QLabel("Big Brother")
        title.setStyleSheet("font-size: 28px; font-weight: bold;")
        subtitle = QLabel("Choose a section to continue")
        subtitle.setStyleSheet("font-size: 16px; color: #666;")

        self.open_website_button = QPushButton("Open Website")
        self.open_website_button.clicked.connect(self.show_website)

        self.open_face_rec_button = QPushButton("Open Face Recognition")
        self.open_face_rec_button.clicked.connect(self.show_face_rec)

        home_layout.addWidget(title)
        home_layout.addWidget(subtitle)
        home_layout.addWidget(self.open_website_button)
        home_layout.addWidget(self.open_face_rec_button)

        self.website_page = WebsiteWindow(self)
        
        # Pass the initialized api_client into FaceRecWidget
        self.face_rec_page = FaceRecWidget(parent=self, api_client=self.api_client)

        self.stack.addWidget(self.home_page)
        self.stack.addWidget(self.website_page)
        self.stack.addWidget(self.face_rec_page)

        nav_layout = QHBoxLayout()
        home_btn = QPushButton("Home")
        home_btn.clicked.connect(self.show_home)
        nav_layout.addWidget(home_btn)

        website_btn = QPushButton("Website")
        website_btn.clicked.connect(self.show_website)
        nav_layout.addWidget(website_btn)

        face_btn = QPushButton("Face Recognition")
        face_btn.clicked.connect(self.show_face_rec)
        nav_layout.addWidget(face_btn)

        main_layout = QVBoxLayout(self)
        main_layout.addLayout(nav_layout)
        main_layout.addWidget(self.stack)

    def show_home(self):
        self.stack.setCurrentWidget(self.home_page)

    def show_website(self):
        self.stack.setCurrentWidget(self.website_page)

    def show_face_rec(self):
        self.stack.setCurrentWidget(self.face_rec_page)


def main() -> int:
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())