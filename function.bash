gcloud config set project cloud-blaze
# mkdir -p roles
# find ../promptLibrary/roles -name '*.json' -exec cp {} roles/ \;
# mkdir -p questions
# find ../promptLibrary/prompt-questions -name '*.json' -exec cp {} questions/ \;

gcloud functions deploy SearchPrompts \
  --runtime go121 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point SearchPrompts \
  --memory=1024MB

echo "rm -rf roles"
echo "rm -rf questions"
