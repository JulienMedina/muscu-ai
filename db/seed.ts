import { runSql } from './schema';

type SeedExercise = {
  id: string;
  name: string;
  primary: string;
  secondary?: string;
  substitutions?: string; // JSON stringified
};

export async function seedExercises(db: any) {
  const exs: SeedExercise[] = [
    // PUSH (pectoraux / deltoïdes / triceps)
    { id: 'ex_push_flat_bb', name: 'Développé couché barre', primary: 'pectoraux', secondary: 'triceps', substitutions: '["ex_push_flat_db","ex_push_machine_chest"]' },
    { id: 'ex_push_flat_db', name: 'Développé couché haltères', primary: 'pectoraux', secondary: 'triceps', substitutions: '["ex_push_flat_bb","ex_push_incline_db"]' },
    { id: 'ex_push_incline_db', name: 'Développé incliné haltères', primary: 'pectoraux', secondary: 'deltoïdes', substitutions: '["ex_push_incline_bb","ex_push_machine_incline"]' },
    { id: 'ex_push_incline_bb', name: 'Développé incliné barre', primary: 'pectoraux', secondary: 'deltoïdes', substitutions: '["ex_push_incline_db","ex_push_flat_bb"]' },
    { id: 'ex_push_decline_bb', name: 'Développé décliné barre', primary: 'pectoraux', secondary: 'triceps', substitutions: '["ex_push_flat_bb","ex_push_dips"]' },
    { id: 'ex_push_ohp_bb', name: 'Développé militaire barre', primary: 'deltoïdes', secondary: 'triceps', substitutions: '["ex_push_ohp_db","ex_push_arnold_press"]' },
    { id: 'ex_push_ohp_db', name: 'Développé militaire haltères', primary: 'deltoïdes', secondary: 'triceps', substitutions: '["ex_push_ohp_bb","ex_push_arnold_press"]' },
    { id: 'ex_push_arnold_press', name: 'Développé Arnold', primary: 'deltoïdes', secondary: 'triceps', substitutions: '["ex_push_ohp_db","ex_push_ohp_bb"]' },
    { id: 'ex_push_dips', name: 'Dips', primary: 'triceps', secondary: 'pectoraux', substitutions: '["ex_push_close_grip_bb","ex_push_flat_db"]' },
    { id: 'ex_push_close_grip_bb', name: 'Développé serré barre', primary: 'triceps', secondary: 'pectoraux', substitutions: '["ex_push_dips","ex_push_flat_bb"]' },

    // PULL (dos / biceps) - quelques items
    { id: 'ex_pull_row_bb', name: 'Rowing barre', primary: 'dos', secondary: 'biceps', substitutions: '["ex_pull_row_db","ex_pull_row_cable"]' },
    { id: 'ex_pull_row_db', name: 'Rowing haltères', primary: 'dos', secondary: 'biceps', substitutions: '["ex_pull_row_bb","ex_pull_row_cable"]' },
    { id: 'ex_pull_row_cable', name: 'Rowing poulie', primary: 'dos', secondary: 'biceps', substitutions: '["ex_pull_lat_pulldown","ex_pull_row_bb"]' },
    { id: 'ex_pull_lat_pulldown', name: 'Tirage vertical', primary: 'dos', secondary: 'biceps', substitutions: '["ex_pull_pullups","ex_pull_row_cable"]' },
    { id: 'ex_pull_pullups', name: 'Tractions', primary: 'dos', secondary: 'biceps', substitutions: '["ex_pull_lat_pulldown","ex_pull_row_bb"]' },

    // LEGS (jambes)
    { id: 'ex_legs_squat_bb', name: 'Squat barre', primary: 'quadriceps', secondary: 'fessiers', substitutions: '["ex_legs_front_squat","ex_legs_hack_squat"]' },
    { id: 'ex_legs_front_squat', name: 'Front squat', primary: 'quadriceps', secondary: 'fessiers', substitutions: '["ex_legs_squat_bb","ex_legs_hack_squat"]' },
    { id: 'ex_legs_hack_squat', name: 'Hack squat', primary: 'quadriceps', secondary: 'fessiers', substitutions: '["ex_legs_squat_bb","ex_legs_leg_press"]' },
    { id: 'ex_legs_leg_press', name: 'Presse à cuisses', primary: 'quadriceps', secondary: 'fessiers', substitutions: '["ex_legs_hack_squat","ex_legs_front_squat"]' },
    { id: 'ex_legs_rdl_bb', name: 'Soulevé de terre jambes tendues', primary: 'ischio-jambiers', secondary: 'fessiers', substitutions: '["ex_legs_rdl_db","ex_legs_hip_thrust"]' },
  ];

  try {
    // En transaction pour de meilleures perfs et atomicité
    if (typeof db.withTransactionAsync === 'function') {
      await db.withTransactionAsync(async (tx?: any) => {
        const conn = tx ?? db;
        if (conn && typeof conn.prepareAsync === 'function') {
          const stmt = await conn.prepareAsync(
            'INSERT OR IGNORE INTO exercises (id,name,primary_target,secondary_target,substitutions) VALUES ($id,$name,$p,$s,$subs)'
          );
          try {
            for (const e of exs) {
              await stmt.executeAsync({
                $id: e.id,
                $name: e.name,
                $p: e.primary,
                $s: e.secondary ?? null,
                $subs: e.substitutions ?? null,
              });
            }
          } finally {
            await stmt.finalizeAsync();
          }
        } else {
          for (const e of exs) {
            await runSql(
              conn,
              'INSERT OR IGNORE INTO exercises (id,name,primary_target,secondary_target,substitutions) VALUES (?,?,?,?,?)',
              [e.id, e.name, e.primary, e.secondary ?? null, e.substitutions ?? null]
            );
          }
        }
      });
    } else if (typeof db.prepareAsync === 'function') {
      const stmt = await db.prepareAsync(
        'INSERT OR IGNORE INTO exercises (id,name,primary_target,secondary_target,substitutions) VALUES ($id,$name,$p,$s,$subs)'
      );
      try {
        for (const e of exs) {
          await stmt.executeAsync({
            $id: e.id,
            $name: e.name,
            $p: e.primary,
            $s: e.secondary ?? null,
            $subs: e.substitutions ?? null,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    } else {
      // Fallback: sans transaction ni prepared
      for (const e of exs) {
        await runSql(
          db,
          'INSERT OR IGNORE INTO exercises (id,name,primary_target,secondary_target,substitutions) VALUES (?,?,?,?,?)',
          [e.id, e.name, e.primary, e.secondary ?? null, e.substitutions ?? null]
        );
      }
    }
    console.log('seed ok');
  } catch (err) {
    console.warn('seed error', err);
  }
}
