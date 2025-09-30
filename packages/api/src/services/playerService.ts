import { Player } from '@stellarburn/shared';
import { getMongo } from './databaseService.js';

export async function getPlayerById(playerId: string): Promise<Player | null> {
  try {
    const db = getMongo('stellarburn');
    const player = await db.collection('players').findOne({ id: playerId });
    return player as Player | null;
  } catch (error) {
    console.error('Error getting player by ID:', error);
    return null;
  }
}

export async function updatePlayer(player: Player): Promise<boolean> {
  try {
    const db = getMongo('stellarburn');
    const result = await db.collection('players').updateOne(
      { id: player.id },
      { $set: player }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating player:', error);
    return false;
  }
}

export async function createPlayer(player: Player): Promise<boolean> {
  try {
    const db = getMongo('stellarburn');
    await db.collection('players').insertOne(player);
    return true;
  } catch (error) {
    console.error('Error creating player:', error);
    return false;
  }
}

export async function deletePlayer(playerId: string): Promise<boolean> {
  try {
    const db = getMongo('stellarburn');
    const result = await db.collection('players').deleteOne({ id: playerId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting player:', error);
    return false;
  }
}

export async function getAllPlayers(): Promise<Player[]> {
  try {
    const db = getMongo('stellarburn');
    const players = await db.collection('players').find({}).toArray();
    return players as unknown as Player[];
  } catch (error) {
    console.error('Error getting all players:', error);
    return [];
  }
}