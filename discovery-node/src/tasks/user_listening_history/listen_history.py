from datetime import datetime


class ListenHistory:
    def __init__(self, agreement_id: int, timestamp: datetime):
        self.agreement_id = agreement_id
        self.timestamp = timestamp

    def to_dict(self):
        return {"agreement_id": self.agreement_id, "timestamp": str(self.timestamp)}
