import logging
import logging.config
import yaml
import os


dir = os.path.dirname(__file__)
config_path=os.path.join(dir,"..", "logging_config.yaml")
def setup_logging():
    """Load logging configuration from YAML file."""
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
        logging.config.dictConfig(config)

    return logging.getLogger("my_logger")
