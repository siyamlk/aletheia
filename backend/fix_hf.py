from huggingface_hub import HfApi
api = HfApi()
repo = "siya2005/aletheia-models"
api.upload_folder(repo_id=repo, folder_path="models/aletheia_bert", path_in_repo="aletheia_bert")
for f in ["config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json"]:
    api.delete_file(path_in_repo=f, repo_id=repo)
print("DONE")
