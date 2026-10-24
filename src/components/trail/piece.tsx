import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { LandmarkFile } from '@/constants/trail';

// Landmark pieces (160×220) and their grayed "missed" versions, imported as components.
import P01BostonCommon from '../../../design/assets/trail/pieces/01-boston-common.svg';
import P01BostonCommonMuted from '../../../design/assets/trail/pieces-muted/01-boston-common-muted.svg';
import P02StateHouse from '../../../design/assets/trail/pieces/02-state-house.svg';
import P02StateHouseMuted from '../../../design/assets/trail/pieces-muted/02-state-house-muted.svg';
import P03ParkStreetChurch from '../../../design/assets/trail/pieces/03-park-street-church.svg';
import P03ParkStreetChurchMuted from '../../../design/assets/trail/pieces-muted/03-park-street-church-muted.svg';
import P04GranaryBuryingGround from '../../../design/assets/trail/pieces/04-granary-burying-ground.svg';
import P04GranaryBuryingGroundMuted from '../../../design/assets/trail/pieces-muted/04-granary-burying-ground-muted.svg';
import P05KingsChapel from '../../../design/assets/trail/pieces/05-kings-chapel.svg';
import P05KingsChapelMuted from '../../../design/assets/trail/pieces-muted/05-kings-chapel-muted.svg';
import P06FranklinLatinSchool from '../../../design/assets/trail/pieces/06-franklin-latin-school.svg';
import P06FranklinLatinSchoolMuted from '../../../design/assets/trail/pieces-muted/06-franklin-latin-school-muted.svg';
import P07OldCornerBookstore from '../../../design/assets/trail/pieces/07-old-corner-bookstore.svg';
import P07OldCornerBookstoreMuted from '../../../design/assets/trail/pieces-muted/07-old-corner-bookstore-muted.svg';
import P08OldSouthMeetingHouse from '../../../design/assets/trail/pieces/08-old-south-meeting-house.svg';
import P08OldSouthMeetingHouseMuted from '../../../design/assets/trail/pieces-muted/08-old-south-meeting-house-muted.svg';
import P09OldStateHouse from '../../../design/assets/trail/pieces/09-old-state-house.svg';
import P09OldStateHouseMuted from '../../../design/assets/trail/pieces-muted/09-old-state-house-muted.svg';
import P10BostonMassacreSite from '../../../design/assets/trail/pieces/10-boston-massacre-site.svg';
import P10BostonMassacreSiteMuted from '../../../design/assets/trail/pieces-muted/10-boston-massacre-site-muted.svg';
import P11FaneuilHall from '../../../design/assets/trail/pieces/11-faneuil-hall.svg';
import P11FaneuilHallMuted from '../../../design/assets/trail/pieces-muted/11-faneuil-hall-muted.svg';
import P12PaulRevereHouse from '../../../design/assets/trail/pieces/12-paul-revere-house.svg';
import P12PaulRevereHouseMuted from '../../../design/assets/trail/pieces-muted/12-paul-revere-house-muted.svg';
import P13OldNorthChurch from '../../../design/assets/trail/pieces/13-old-north-church.svg';
import P13OldNorthChurchMuted from '../../../design/assets/trail/pieces-muted/13-old-north-church-muted.svg';
import P14CoppsHill from '../../../design/assets/trail/pieces/14-copps-hill.svg';
import P14CoppsHillMuted from '../../../design/assets/trail/pieces-muted/14-copps-hill-muted.svg';
import P15UssConstitution from '../../../design/assets/trail/pieces/15-uss-constitution.svg';
import P15UssConstitutionMuted from '../../../design/assets/trail/pieces-muted/15-uss-constitution-muted.svg';
import P16BunkerHillMonument from '../../../design/assets/trail/pieces/16-bunker-hill-monument.svg';
import P16BunkerHillMonumentMuted from '../../../design/assets/trail/pieces-muted/16-bunker-hill-monument-muted.svg';

const PIECES: Record<LandmarkFile, FC<SvgProps>> = {
  '01-boston-common': P01BostonCommon,
  '02-state-house': P02StateHouse,
  '03-park-street-church': P03ParkStreetChurch,
  '04-granary-burying-ground': P04GranaryBuryingGround,
  '05-kings-chapel': P05KingsChapel,
  '06-franklin-latin-school': P06FranklinLatinSchool,
  '07-old-corner-bookstore': P07OldCornerBookstore,
  '08-old-south-meeting-house': P08OldSouthMeetingHouse,
  '09-old-state-house': P09OldStateHouse,
  '10-boston-massacre-site': P10BostonMassacreSite,
  '11-faneuil-hall': P11FaneuilHall,
  '12-paul-revere-house': P12PaulRevereHouse,
  '13-old-north-church': P13OldNorthChurch,
  '14-copps-hill': P14CoppsHill,
  '15-uss-constitution': P15UssConstitution,
  '16-bunker-hill-monument': P16BunkerHillMonument,
};

const MUTED: Record<LandmarkFile, FC<SvgProps>> = {
  '01-boston-common': P01BostonCommonMuted,
  '02-state-house': P02StateHouseMuted,
  '03-park-street-church': P03ParkStreetChurchMuted,
  '04-granary-burying-ground': P04GranaryBuryingGroundMuted,
  '05-kings-chapel': P05KingsChapelMuted,
  '06-franklin-latin-school': P06FranklinLatinSchoolMuted,
  '07-old-corner-bookstore': P07OldCornerBookstoreMuted,
  '08-old-south-meeting-house': P08OldSouthMeetingHouseMuted,
  '09-old-state-house': P09OldStateHouseMuted,
  '10-boston-massacre-site': P10BostonMassacreSiteMuted,
  '11-faneuil-hall': P11FaneuilHallMuted,
  '12-paul-revere-house': P12PaulRevereHouseMuted,
  '13-old-north-church': P13OldNorthChurchMuted,
  '14-copps-hill': P14CoppsHillMuted,
  '15-uss-constitution': P15UssConstitutionMuted,
  '16-bunker-hill-monument': P16BunkerHillMonumentMuted,
};

export const PIECE_ASPECT = 220 / 160;

/** One Freedom Trail landmark. `muted` is the grayed version for a missed stop. */
export function Piece({ file, width = 160, muted }: { file: LandmarkFile; width?: number; muted?: boolean }) {
  const Component = (muted ? MUTED : PIECES)[file];
  return <Component width={width} height={width * PIECE_ASPECT} />;
}
