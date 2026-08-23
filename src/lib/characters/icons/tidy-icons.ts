import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import {
	faArrowDownWideShort,
	faArrowRightFromBracket,
	faArrowTurnDown,
	faAnglesDown,
	faAnglesUp,
	faBolt,
	faBookOpen,
	faBoxOpen,
	faBriefcase,
	faBug,
	faChevronDown,
	faChevronRight,
	faChevronUp,
	faCircleInfo,
	faCircle,
	faCircleDot,
	faCircleHalfStroke,
	faCoins,
	faDiamond,
	faDiceD20,
	faEllipsisVertical,
	faFeatherPointed,
	faFilter,
	faFlask,
	faGear,
	faHammer,
	faHeartCrack,
	faLanguage,
	faMagnifyingGlass,
	faPerson,
	faPlus,
	faRulerHorizontal,
	faScaleBalanced,
	faShieldHalved,
	faShield,
	faStar,
	faSuitcase,
	faToolbox,
	faUser,
	faWandSparkles,
	faWeightHanging,
	faXmark
} from '@fortawesome/free-solid-svg-icons';

import {
	faBookmark as faBookmarkRegular,
	faCircle as faCircleRegular,
	faHeart as faHeartRegular,
	faStar as faStarRegular
} from '@fortawesome/free-regular-svg-icons';

export type TidyIcon = IconDefinition;

/*
 * Sheet-level navigation
 */

export const characterIcon: TidyIcon = faUser;

export const inventoryIcon: TidyIcon = faSuitcase;

export const spellbookIcon: TidyIcon = faBookOpen;

export const featuresIcon: TidyIcon = faStar;

export const biographyIcon: TidyIcon = faFeatherPointed;

export const diagnosticsIcon: TidyIcon = faBug;

/*
 * Header controls
 */

export const closeIcon: TidyIcon = faXmark;

export const closeSheetIcon: TidyIcon = faArrowRightFromBracket;

export const settingsIcon: TidyIcon = faGear;

export const levelIcon: TidyIcon = faDiceD20;

/*
 * Expandable sections
 */

export const expandIcon: TidyIcon = faChevronDown;

export const collapseIcon: TidyIcon = faChevronUp;

export const collapseAllIcon: TidyIcon = faChevronUp;

export const expandAllIcon: TidyIcon = faAnglesDown;

export const collapseAllDoubleIcon: TidyIcon = faAnglesUp;

export const nextIcon: TidyIcon = faChevronRight;

/*
 * Toolbar and table controls
 */

export const searchIcon: TidyIcon = faMagnifyingGlass;

export const addIcon: TidyIcon = faPlus;

export const filterIcon: TidyIcon = faFilter;

export const sortIcon: TidyIcon = faArrowDownWideShort;

export const informationIcon: TidyIcon = faCircleInfo;

export const moreOptionsIcon: TidyIcon = faEllipsisVertical;

/*
 * Character-tab panels
 */

export const skillsIcon: TidyIcon = faBriefcase;

export const toolsIcon: TidyIcon = faToolbox;

export const savingThrowsIcon: TidyIcon = faShieldHalved;

export const savingThrowMarkerIcon: TidyIcon = faShield;

export const spellSlotIcon: TidyIcon = faDiamond;

export const notProficientIcon: TidyIcon = faCircleRegular;

export const halfProficientIcon: TidyIcon = faCircleHalfStroke;

export const proficientIcon: TidyIcon = faCircle;

export const expertiseIcon: TidyIcon = faCircleDot;

export const speciesIcon: TidyIcon = faPerson;

export const sizeIcon: TidyIcon = faRulerHorizontal;

export const languagesIcon: TidyIcon = faLanguage;

export const armorIcon: TidyIcon = faShieldHalved;

export const weaponsIcon: TidyIcon = faHammer;

export const specialTraitsIcon: TidyIcon = faStarRegular;

export const speedIcon: TidyIcon = faBolt;

export const resistanceIcon: TidyIcon = faShieldHalved;

export const immunityIcon: TidyIcon = faShield;

export const vulnerabilityIcon: TidyIcon = faHeartCrack;

export const traitContinuationIcon: TidyIcon = faArrowTurnDown;

/*
 * Inventory
 */

export const encumbranceIcon: TidyIcon = faWeightHanging;

export const carryingCapacityIcon: TidyIcon = faScaleBalanced;

export const currencyIcon: TidyIcon = faCoins;

export const containerIcon: TidyIcon = faBoxOpen;

export const equipmentIcon: TidyIcon = faSuitcase;

export const attunementIcon: TidyIcon = faGear;

export const favoriteIcon: TidyIcon = faHeartRegular;

export const bookmarkIcon: TidyIcon = faBookmarkRegular;

/*
 * Spellbook and features
 */

export const spellIcon: TidyIcon = faWandSparkles;

export const potionIcon: TidyIcon = faFlask;
