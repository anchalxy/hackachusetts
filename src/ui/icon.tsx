import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

// Every Leafy-style icon from the design handoff (design/assets/icons, design/assets/trail/icons),
// imported as components (metro.config.js).
import Bag from '../../design/assets/icons/bag.svg';
import Ballot from '../../design/assets/icons/ballot.svg';
import Bell from '../../design/assets/icons/bell.svg';
import Bench from '../../design/assets/icons/bench.svg';
import Bike from '../../design/assets/icons/bike.svg';
import Bolt from '../../design/assets/icons/bolt.svg';
import Budget from '../../design/assets/icons/budget.svg';
import Burrow from '../../design/assets/trail/icons/burrow.svg';
import Bus from '../../design/assets/trail/icons/bus.svg';
import Calendar from '../../design/assets/icons/calendar.svg';
import Camera from '../../design/assets/icons/camera.svg';
import Cityhall from '../../design/assets/icons/cityhall.svg';
import Coffee from '../../design/assets/icons/coffee.svg';
import Crosswalk from '../../design/assets/icons/crosswalk.svg';
import Doc from '../../design/assets/icons/doc.svg';
import Droppings from '../../design/assets/trail/icons/droppings.svg';
import Flag from '../../design/assets/icons/flag.svg';
import Flame from '../../design/assets/icons/flame.svg';
import Gear from '../../design/assets/icons/gear.svg';
import Gift from '../../design/assets/icons/gift.svg';
import Graffiti from '../../design/assets/icons/graffiti.svg';
import Help from '../../design/assets/icons/help.svg';
import House from '../../design/assets/icons/house.svg';
import Idcard from '../../design/assets/icons/idcard.svg';
import Lantern from '../../design/assets/icons/lantern.svg';
import Leafy from '../../design/assets/mascots/leafy.svg';
import LeafySmall from '../../design/assets/mascots/leafy-small.svg';
import Livestream from '../../design/assets/trail/icons/livestream.svg';
import Lock from '../../design/assets/icons/lock.svg';
import Notes from '../../design/assets/icons/notes.svg';
import Obelisk from '../../design/assets/icons/obelisk.svg';
import Parking from '../../design/assets/icons/parking.svg';
import Person from '../../design/assets/icons/person.svg';
import Pin from '../../design/assets/trail/icons/pin.svg';
import PinFixed from '../../design/assets/icons/pin-fixed.svg';
import PinOpen from '../../design/assets/icons/pin-open.svg';
import PinReview from '../../design/assets/icons/pin-review.svg';
import Pothole from '../../design/assets/icons/pothole.svg';
import Rat from '../../design/assets/trail/icons/rat.svg';
import Route from '../../design/assets/icons/route.svg';
import Share from '../../design/assets/icons/share.svg';
import Shield from '../../design/assets/icons/shield.svg';
import Sidewalk from '../../design/assets/icons/sidewalk.svg';
import Signpost from '../../design/assets/trail/icons/signpost.svg';
import Siren from '../../design/assets/icons/siren.svg';
import Statehouse from '../../design/assets/icons/statehouse.svg';
import Stopwatch from '../../design/assets/icons/stopwatch.svg';
import Streetlight from '../../design/assets/icons/streetlight.svg';
import Stroller from '../../design/assets/trail/icons/stroller.svg';
import Teacup from '../../design/assets/icons/teacup.svg';
import Ticket from '../../design/assets/icons/ticket.svg';
import Traffic from '../../design/assets/icons/traffic.svg';
import TrailTicket from '../../design/assets/trail/icons/ticket.svg';
import Trash from '../../design/assets/icons/trash.svg';
import TrashOpen from '../../design/assets/trail/icons/trash-open.svg';
import Tree from '../../design/assets/icons/tree.svg';
import Trophy from '../../design/assets/icons/trophy.svg';
import Walk from '../../design/assets/trail/icons/walk.svg';
import Water from '../../design/assets/icons/water.svg';
import Wheelchair from '../../design/assets/trail/icons/wheelchair.svg';

const ICONS = {
  bag: Bag,
  ballot: Ballot,
  bell: Bell,
  bench: Bench,
  bike: Bike,
  bolt: Bolt,
  budget: Budget,
  calendar: Calendar,
  camera: Camera,
  cityhall: Cityhall,
  coffee: Coffee,
  crosswalk: Crosswalk,
  doc: Doc,
  flag: Flag,
  flame: Flame,
  gear: Gear,
  gift: Gift,
  graffiti: Graffiti,
  help: Help,
  house: House,
  idcard: Idcard,
  lantern: Lantern,
  lock: Lock,
  notes: Notes,
  obelisk: Obelisk,
  parking: Parking,
  person: Person,
  pinFixed: PinFixed,
  pinOpen: PinOpen,
  pinReview: PinReview,
  pothole: Pothole,
  route: Route,
  share: Share,
  shield: Shield,
  sidewalk: Sidewalk,
  siren: Siren,
  statehouse: Statehouse,
  stopwatch: Stopwatch,
  streetlight: Streetlight,
  teacup: Teacup,
  ticket: Ticket,
  traffic: Traffic,
  trash: Trash,
  tree: Tree,
  trophy: Trophy,
  water: Water,
  burrow: Burrow,
  bus: Bus,
  droppings: Droppings,
  livestream: Livestream,
  pin: Pin,
  rat: Rat,
  signpost: Signpost,
  stroller: Stroller,
  trailTicket: TrailTicket,
  trashOpen: TrashOpen,
  walk: Walk,
  wheelchair: Wheelchair,
  leafy: Leafy,
  leafySmall: LeafySmall,
} satisfies Record<string, FC<SvgProps>>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const Component = ICONS[name];
  return <Component width={size} height={size} />;
}
