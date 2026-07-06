import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Session extends Document {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ type: Object, default: {} })
  state: any;

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
