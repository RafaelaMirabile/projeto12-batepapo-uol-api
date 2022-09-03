import { participantSchema } from "../models/participant.js";

export function validateParticipant(participant){   
    const validation = participantSchema.validate(participant,{abortEarly:false});   
    if(validation.error){
    return validation;
};
}