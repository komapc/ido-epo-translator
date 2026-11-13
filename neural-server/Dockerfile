# Server-side neural engine for Cloud Run. Model files are baked into the image so a cold
# start does not download ~1 GB. Pinned to the komapc/nllb-ido-multi-onnx revision the site uses.
FROM node:24-slim
ARG HF_REV=9c82051
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && find node_modules/onnxruntime-node/bin -name '*cuda*' -o -name '*tensorrt*' | xargs rm -f
RUN set -e; B=https://huggingface.co/komapc/nllb-ido-multi-onnx/resolve/$HF_REV; mkdir -p model/onnx model/onnx_ido_v2; \
  for f in config.json generation_config.json tokenizer.json tokenizer_config.json \
           onnx/encoder_model_quantized.onnx onnx/decoder_model_merged_quantized.onnx \
           onnx_ido_v2/encoder_model_quantized.onnx onnx_ido_v2/decoder_model_merged_quantized.onnx; do \
    node -e "fetch(process.argv[1]).then(async r=>{if(!r.ok)throw new Error(r.status+' '+process.argv[1]);require('fs').writeFileSync(process.argv[2],Buffer.from(await r.arrayBuffer()))})" "$B/$f" "model/$f"; done
COPY server.mjs ./
ENV NODE_ENV=production THREADS=2 MAX_CHARS=1000
EXPOSE 8080
CMD ["node", "server.mjs"]
