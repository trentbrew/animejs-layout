export const PLANET_TYPES = ['Rocky planet', 'Gas giant', 'Ice giant'] as const;

export type PlanetType = (typeof PLANET_TYPES)[number];

export type Planet = {
	id: string;
	name: string;
	/** SVG circle radius inside the 600x600 viewBox. */
	radius: number;
	type: PlanetType;
	description: string;
	/** Index into the theme's `--chart-*` / accent ramp, rendered as `data-color`. */
	color: number;
	/** Ring radii inside the 600x600 viewBox. Empty for ringless planets. */
	rings: number[];
	facts: string[];
};

export const PLANETS: Planet[] = [
	{
		id: 'mercury',
		name: 'Mercury',
		radius: 60,
		type: 'Rocky planet',
		description: 'Smallest planet and closest to the Sun.',
		color: 1,
		rings: [],
		facts: [
			'A single day lasts 59 Earth days, but a year only takes 88.',
			'Surface temperatures swing from 430°C to -180°C.',
			'Its iron core makes up roughly 85% of the planet’s radius.',
			'There is no atmosphere to soften incoming meteorites.'
		]
	},
	{
		id: 'venus',
		name: 'Venus',
		radius: 90,
		type: 'Rocky planet',
		description: 'Slow-spinning world with runaway greenhouse heat.',
		color: 2,
		rings: [],
		facts: [
			'A thick CO₂ atmosphere traps heat at a surface of 465°C.',
			'It rotates backwards, and slower than it orbits.',
			'Sulphuric acid clouds make it the brightest planet in our sky.',
			'Surface pressure is 92 times that of Earth at sea level.'
		]
	},
	{
		id: 'earth',
		name: 'Earth',
		radius: 100,
		type: 'Rocky planet',
		description: 'It’s apparently pretty nice over there.',
		color: 6,
		rings: [],
		facts: [
			'The only place in the universe known to host life.',
			'71% of the surface is covered by liquid water.',
			'Its magnetic field deflects the solar wind.',
			'The Moon stabilises the tilt that gives us seasons.'
		]
	},
	{
		id: 'mars',
		name: 'Mars',
		radius: 80,
		type: 'Rocky planet',
		description: 'Cold desert planet with canyons and polar ice.',
		color: 0,
		rings: [],
		facts: [
			'Valles Marineris runs for more than 4,000 km.',
			'Olympus Mons is the tallest volcano in the solar system.',
			'Polar caps are made of both water ice and CO₂ ice.',
			'Dust storms can wrap the entire planet for weeks.'
		]
	},
	{
		id: 'jupiter',
		name: 'Jupiter',
		radius: 250,
		type: 'Gas giant',
		description: 'Gigantic gas giant with a powerful magnetic field.',
		color: 3,
		rings: [],
		facts: [
			'Its magnetosphere is the largest structure in the solar system.',
			'The Great Red Spot has raged for at least 190 years.',
			'It holds 2.5 times the mass of every other planet combined.',
			'It completes a rotation in under 10 hours.'
		]
	},
	{
		id: 'saturn',
		name: 'Saturn',
		radius: 150,
		type: 'Gas giant',
		description: 'Ringed gas giant with dozens of icy moons.',
		color: 4,
		rings: [180, 200, 220, 240],
		facts: [
			'The rings are mostly water ice, some grains as small as dust.',
			'They span 280,000 km but are often under 30 m thick.',
			'Its density is low enough that it would float in water.',
			'Enceladus vents a subsurface ocean into space.'
		]
	},
	{
		id: 'uranus',
		name: 'Uranus',
		radius: 120,
		type: 'Ice giant',
		description: 'An ice giant tipped almost completely on its side.',
		color: 8,
		rings: [150],
		facts: [
			'Its axial tilt of 98° makes the poles take turns facing the Sun.',
			'Methane in the upper atmosphere gives it a cyan hue.',
			'It has 13 faint, narrow rings.',
			'Seasons there last about 21 Earth years each.'
		]
	},
	{
		id: 'neptune',
		name: 'Neptune',
		radius: 110,
		type: 'Ice giant',
		description: 'Distant ice giant with supersonic winds.',
		color: 10,
		rings: [],
		facts: [
			'Winds reach 2,100 km/h, the fastest in the solar system.',
			'It was found by mathematics before it was ever observed.',
			'It radiates 2.6 times more energy than it receives.',
			'One orbit takes 165 Earth years.'
		]
	}
];

export const INITIAL_VISIBLE = 4;

export const LAYOUTS = ['grid', 'list', 'stripes', 'stack', 'chaos'] as const;

export type Layout = (typeof LAYOUTS)[number];
