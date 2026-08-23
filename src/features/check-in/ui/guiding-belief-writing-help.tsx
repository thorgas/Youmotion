import { PressableScale } from 'pressto';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type } from '@/theme';

export function GuidingBeliefWritingHelp({
  contentTestID,
  disabled,
  expanded,
  onToggle,
  toggleTestID,
}: {
  contentTestID: string;
  disabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  toggleTestID: string;
}) {
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        disabled={disabled}
        onPress={onToggle}
        style={styles.helpButton}
        testID={toggleTestID}
      >
        <Text style={styles.helpButtonText}>
          {expanded
            ? <fbt desc="Button hiding guiding belief writing help">Hide writing help</fbt>
            : <fbt desc="Button revealing guiding belief writing help">Need help writing this?</fbt>}
        </Text>
        <Text style={styles.helpButtonMark}>{expanded ? '−' : '+'}</Text>
      </PressableScale>
      {expanded ? (
        <View style={styles.helpContent} testID={contentTestID}>
          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionTitle}>
              <fbt desc="Heading above reflection prompts for changing a harmful belief">
                Take a moment before rewriting it
              </fbt>
            </Text>
            <Text style={styles.prompt}>
              <Text style={styles.promptMark}>1 · </Text>
              <fbt desc="Prompt asking what a harmful belief once provided">
                What did this rule once help you gain or protect?
              </fbt>
            </Text>
            <Text style={styles.prompt}>
              <Text style={styles.promptMark}>2 · </Text>
              <fbt desc="Prompt asking where a harmful belief causes difficulty">
                Where does it make life harder for you or the people close to you today?
              </fbt>
            </Text>
            <Text style={styles.prompt}>
              <Text style={styles.promptMark}>3 · </Text>
              <fbt desc="Prompt imagining changed behavior under a positive guiding belief">
                What would you notice tomorrow if the new sentence already guided one small choice?
              </fbt>
            </Text>
          </View>
          <View style={styles.tips}>
            <Text style={styles.tip}>
              <Text style={styles.tipMark}>• </Text>
              <fbt desc="Tip to avoid absolute language in a positive guiding belief">
                Avoid absolutes such as always, must, never, or everything.
              </fbt>
            </Text>
            <Text style={styles.tip}>
              <Text style={styles.tipMark}>• </Text>
              <fbt desc="Tip to use positive new wording in a positive guiding belief">
                Use fresh, positive words instead of building the sentence around a negation.
              </fbt>
            </Text>
            <Text style={styles.tip}>
              <Text style={styles.tipMark}>• </Text>
              <fbt desc="Tip to keep a positive guiding belief memorable">
                Keep it short enough to remember when you need it.
              </fbt>
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  helpButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: palette.hairline,
    marginTop: 2,
    paddingTop: 10,
  },
  helpButtonText: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 13,
  },
  helpButtonMark: {
    fontFamily: type.medium,
    color: palette.moss,
    fontSize: 20,
    lineHeight: 22,
  },
  helpContent: { gap: 14 },
  reflectionCard: {
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: palette.selectionWash,
    padding: 20,
    gap: 14,
  },
  reflectionTitle: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 16,
  },
  prompt: {
    fontFamily: type.regular,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  promptMark: {
    fontFamily: type.semibold,
    color: palette.moss,
  },
  tips: { gap: 8 },
  tip: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  tipMark: { color: palette.moss },
});
