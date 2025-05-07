import os
import time
from datetime import datetime
import logging

# Configure logger with UTF-8 encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    encoding='utf-8'  # Specify UTF-8 encoding
)
class CustomLogger:
    def __init__(self):
        self.log_dir =  "/app/logs"
        self._setup_log_directory()
        self._setup_log_files()

    def _setup_log_directory(self):
        """Create logs directory if it doesn't exist"""
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)

    def _setup_log_files(self):
        """Setup log files with current date"""
        filename = time.strftime("%Y-%m-%d")
        self.info_file = os.path.join(self.log_dir, f"Infolog-{filename}.txt")
        self.warning_file = os.path.join(self.log_dir, f"Warninglog-{filename}.txt")
        self.error_file = os.path.join(self.log_dir, f"Errorlog-{filename}.txt")

    def _write_log(self, file_path: str, level: str, message: str):
        """Write log message to specified file"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"{level}: {timestamp} - {message}\n"
        
        with open(file_path, "a",encoding="utf-8") as f:
            f.write(log_message)

    def info(self, message: str):
        """Log info level message"""
        self._write_log(self.info_file, "INFO", message)

    def warning(self, message: str):
        """Log warning level message"""
        self._write_log(self.warning_file, "WARNING", message)

    def error(self, message: str):
        """Log error level message"""
        self._write_log(self.error_file, "ERROR", message)

# Create a global logger instance
logger = CustomLogger()

# Export the logging functions
info = logger.info
warning = logger.warning
error = logger.error