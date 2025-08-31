<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class RootUserSeeder extends Seeder
{
    public function run(): void
    {
        $name = env('ROOT_USER_NAME', 'Administrador');
        $email = strtolower(env('ROOT_USER_EMAIL', 'admin@example.com'));
        $password = env('ROOT_USER_PASSWORD', 'admin123');

        $user = DB::table('users')->where('email', $email)->first();
        if (!$user) {
            DB::table('users')->insert([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
