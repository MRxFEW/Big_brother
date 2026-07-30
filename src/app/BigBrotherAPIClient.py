import requests

class BigBrotherAPIClient:
    def __init__(self, region="us-central1", project_id="bbcv1"):
        # Replace these URLs with your actual deployed Firebase Cloud Function endpoints
        self.get_url = f"https://us-central1-bigbrother-d514d.cloudfunctions.net/bigbro_get"
        self.post_url = f"https://us-central1-bigbrother-d514d.cloudfunctions.net/bigbro_post"

    def bigbro_get(self, payload):
        """
        Calls the bigbro_get backend function to fetch user profile 
        and group member face encodings.
        """
        try:
            response = requests.post(self.get_url, json={"data": payload}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                # Firebase v2 callable functions wrap responses in a 'result' object
                return result.get("result", result)
            else:
                raise Exception(f"Server error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"API Get Error: {e}")
            return {"ok": False, "members": []}

    def bigbro_post(self, payload):
        """
        Calls the bigbro_post backend function to securely verify credentials 
        and log session time, total time, and last_active timestamps.
        """
        try:
            response = requests.post(self.post_url, json={"data": payload}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                return result.get("result", result)
            else:
                raise Exception(f"Server error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"API Post Error: {e}")
            return {"ok": False, "error": str(e)}