from datetime import datetime


class ListenHistory:
    def __init__(self, digital_content_id: int, timestamp: datetime):
        self.digital_content_id = digital_content_id
        self.timestamp = timestamp

    def to_dict(self):
        return {"digital_content_id": self.digital_content_id, "timestamp": str(self.timestamp)}
