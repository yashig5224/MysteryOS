def generate_report(investigation, findings):
    return {"title": investigation.get("title", "Investigation"), "findings": findings}
