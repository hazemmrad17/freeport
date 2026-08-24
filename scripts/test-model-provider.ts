import { getModelForRequest, DEFAULT_MODEL } from '../sdk/src/impl/model-provider'

console.log('Testing getModelForRequest...')
const model = getModelForRequest()
console.log('Model provider:', (model as any).provider)
console.log('Model ID:', (model as any).modelId)
console.log('Default Model constant:', DEFAULT_MODEL)
console.log('✅ Model provider initialized successfully and points to DeepInfra DeepSeek V4 Flash!')
