import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Built-in workout presets available to every user.
const PRESETS = [
  {
    name: 'Push Day',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 8 },
      { name: 'Overhead Press', sets: 3, reps: 10 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 12 },
      { name: 'Triceps Pushdown', sets: 3, reps: 15 },
    ],
  },
  {
    name: 'Pull Day',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 6 },
      { name: 'Pull-ups', sets: 3, reps: 10 },
      { name: 'Barbell Row', sets: 3, reps: 10 },
      { name: 'Bicep Curl', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Leg Day',
    exercises: [
      { name: 'Squat', sets: 4, reps: 8 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10 },
      { name: 'Leg Press', sets: 3, reps: 12 },
      { name: 'Calf Raise', sets: 4, reps: 15 },
    ],
  },
];

async function main() {
  for (const preset of PRESETS) {
    const exists = await prisma.routine.findFirst({
      where: { name: preset.name, isPreset: true },
    });
    if (!exists) {
      await prisma.routine.create({
        data: { name: preset.name, isPreset: true, exercises: preset.exercises },
      });
      console.log(`seeded preset: ${preset.name}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
