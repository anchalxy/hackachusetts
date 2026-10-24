import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

// Leafy-style icons from the design handoff, imported as components (metro.config.js).
import Ballot from '../../design/assets/icons/ballot.svg';
import Bench from '../../design/assets/icons/bench.svg';
import Calendar from '../../design/assets/icons/calendar.svg';
import Camera from '../../design/assets/icons/camera.svg';
import CityHall from '../../design/assets/icons/cityhall.svg';
import Crosswalk from '../../design/assets/icons/crosswalk.svg';
import Doc from '../../design/assets/icons/doc.svg';
import Flag from '../../design/assets/icons/flag.svg';
import Flame from '../../design/assets/icons/flame.svg';
import Graffiti from '../../design/assets/icons/graffiti.svg';
import Lock from '../../design/assets/icons/lock.svg';
import Notes from '../../design/assets/icons/notes.svg';
import Parking from '../../design/assets/icons/parking.svg';
import Pothole from '../../design/assets/icons/pothole.svg';
import Shield from '../../design/assets/icons/shield.svg';
import Sidewalk from '../../design/assets/icons/sidewalk.svg';
import Siren from '../../design/assets/icons/siren.svg';
import Streetlight from '../../design/assets/icons/streetlight.svg';
import Teacup from '../../design/assets/icons/teacup.svg';
import Traffic from '../../design/assets/icons/traffic.svg';
import Trash from '../../design/assets/icons/trash.svg';
import Tree from '../../design/assets/icons/tree.svg';
import Leafy from '../../design/assets/mascots/leafy.svg';
import LeafySmall from '../../design/assets/mascots/leafy-small.svg';

const ICONS = {
  ballot: Ballot,
  bench: Bench,
  calendar: Calendar,
  camera: Camera,
  cityhall: CityHall,
  crosswalk: Crosswalk,
  doc: Doc,
  flag: Flag,
  flame: Flame,
  graffiti: Graffiti,
  lock: Lock,
  notes: Notes,
  parking: Parking,
  pothole: Pothole,
  shield: Shield,
  sidewalk: Sidewalk,
  siren: Siren,
  streetlight: Streetlight,
  teacup: Teacup,
  traffic: Traffic,
  trash: Trash,
  tree: Tree,
  leafy: Leafy,
  leafySmall: LeafySmall,
} satisfies Record<string, FC<SvgProps>>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const Component = ICONS[name];
  return <Component width={size} height={size} />;
}
