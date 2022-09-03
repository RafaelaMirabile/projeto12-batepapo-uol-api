import {messageSchema} from "../models/message.js"

export function validateMessage(message){
    const validation = messageSchema.validate(message, {abortEarly:false})

    if(validation.error){
        return validation;
}
}
