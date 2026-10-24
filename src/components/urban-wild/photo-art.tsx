import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { Icon } from '@/ui/icon';

import LeafPile from '../../../design/assets/trail/scenery/leaf-pile.svg';
import TreeBare from '../../../design/assets/trail/scenery/tree-bare.svg';
import TreeMaple from '../../../design/assets/trail/scenery/tree-maple.svg';
import TreeOak from '../../../design/assets/trail/scenery/tree-oak.svg';
import TreePine from '../../../design/assets/trail/scenery/tree-pine.svg';
import type { PhotoSlot } from './store';

/**
 * Illustrated stand-in for a photo the user skipped (and the look of the mockup's slots):
 * sky, ground, and a few scenery pieces per slot. Fills its parent.
 */
export function PhotoArt({ slot }: { slot: PhotoSlot }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 92" preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={100} height={56} fill="#E3EBEE" />
        <Rect x={0} y={56} width={100} height={36} fill="#E9EDDC" />
        {slot === 'entrance' ? <Path d="M42 92 L50 56 L56 56 L66 92 Z" fill="#F1E2CC" /> : null}
        {slot === 'best' ? (
          <>
            <Ellipse cx={50} cy={72} rx={36} ry={12} fill="#A8D2EA" stroke="#2E6E9E" strokeWidth={1.2} />
            <Path d="M36 70 q4 -3 8 0 M56 75 q4 -3 8 0" stroke="#FFFFFF" strokeWidth={1.2} fill="none" />
          </>
        ) : null}
      </Svg>
      {slot === 'entrance' ? (
        <>
          <Piece at={{ left: '2%', top: '20%' }} size="38%">
            <TreeMaple width="100%" height="100%" />
          </Piece>
          <Piece at={{ right: '2%', top: '22%' }} size="32%">
            <TreeOak width="100%" height="100%" />
          </Piece>
          <Piece at={{ left: '50%', top: '40%' }} size="22%">
            <Icon name="signpost" size={26} />
          </Piece>
        </>
      ) : null}
      {slot === 'best' ? (
        <>
          <Piece at={{ left: '2%', top: '18%' }} size="32%">
            <TreeOak width="100%" height="100%" />
          </Piece>
          <Piece at={{ left: '35%', top: '14%' }} size="30%">
            <TreePine width="100%" height="100%" />
          </Piece>
          <Piece at={{ right: '2%', top: '18%' }} size="32%">
            <TreeMaple width="100%" height="100%" />
          </Piece>
        </>
      ) : null}
      {slot === 'worst' ? (
        <>
          <Piece at={{ left: '8%', top: '12%' }} size="36%">
            <TreeBare width="100%" height="100%" />
          </Piece>
          <Piece at={{ left: '20%', bottom: '4%' }} size="26%">
            <LeafPile width="100%" height="100%" />
          </Piece>
          <Piece at={{ right: '8%', bottom: '4%' }} size="36%">
            <Icon name="trashOpen" size={40} />
          </Piece>
        </>
      ) : null}
    </View>
  );
}

function Piece({
  at,
  size,
  children,
}: {
  at: { left?: `${number}%`; right?: `${number}%`; top?: `${number}%`; bottom?: `${number}%` };
  size: `${number}%`;
  children: ReactNode;
}) {
  return (
    <View style={[styles.piece, at, { width: size, aspectRatio: 1 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
