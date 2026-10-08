import * as Schema from 'effect/Schema';
import { setup } from 'xstate';

import { SOURCE_CODE_EVENTS, SOURCE_CODE_STATES } from '@/constants';
import { openSourceCode } from '../infrastructure/source-code-browser';

const EmptyEventSchema = Schema.standardSchemaV1(Schema.Struct({}));

export const sourceCodeMachine = setup({
  states: {
    [SOURCE_CODE_STATES.IDLE]: {},
    [SOURCE_CODE_STATES.OPENING]: {},
    [SOURCE_CODE_STATES.FAILURE]: {},
  },
  schemas: {
    events: {
      [SOURCE_CODE_EVENTS.OPEN_REQUESTED]: EmptyEventSchema,
      [SOURCE_CODE_EVENTS.OPENED]: EmptyEventSchema,
      [SOURCE_CODE_EVENTS.OPEN_FAILED]: EmptyEventSchema,
      [SOURCE_CODE_EVENTS.DISMISSED]: EmptyEventSchema,
    },
  },
}).createMachine({
  id: 'sourceCode',
  initial: SOURCE_CODE_STATES.IDLE,
  states: {
    [SOURCE_CODE_STATES.IDLE]: {
      on: { [SOURCE_CODE_EVENTS.OPEN_REQUESTED]: { target: SOURCE_CODE_STATES.OPENING } },
    },
    [SOURCE_CODE_STATES.OPENING]: {
      entry: ({ self }, enq) => {
        enq(() => {
          void openSourceCode().then(
            () => self.send({ type: SOURCE_CODE_EVENTS.OPENED }),
            () => self.send({ type: SOURCE_CODE_EVENTS.OPEN_FAILED }),
          );
        });
      },
      on: {
        [SOURCE_CODE_EVENTS.OPENED]: { target: SOURCE_CODE_STATES.IDLE },
        [SOURCE_CODE_EVENTS.OPEN_FAILED]: { target: SOURCE_CODE_STATES.FAILURE },
      },
    },
    [SOURCE_CODE_STATES.FAILURE]: {
      on: {
        [SOURCE_CODE_EVENTS.OPEN_REQUESTED]: { target: SOURCE_CODE_STATES.OPENING },
        [SOURCE_CODE_EVENTS.DISMISSED]: { target: SOURCE_CODE_STATES.IDLE },
      },
    },
  },
});
