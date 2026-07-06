import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class OutboxEvent extends Document {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object, required: true })
  payload: any;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop()
  error?: string;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
