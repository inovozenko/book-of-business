import annaBlackwood  from '../../assets/avatars/anna-blackwood.jpg';
import jamesWalker    from '../../assets/avatars/james-walker.jpg';
import mariaGutierrez from '../../assets/avatars/maria-gutierrez.jpg';
import robertChen     from '../../assets/avatars/robert-chen.jpg';
import sarahSmith     from '../../assets/avatars/sarah-smith.jpg';

/**
 * Photos of the advisers from the design, by employee id. The API has no avatar field
 * (see ADR T5), so this only covers the five people from the assignment; everyone else
 * gets initials.
 */
export const employeeAvatars: Readonly<Record<string, string>> = {
  'e3c4637b-2f21-4b7e-883e-b13ae1a6df6a': annaBlackwood,
  'afe9ebc0-6c35-4690-80b0-20e9bc0d8c7d': jamesWalker,
  'bb012770-02d3-4999-aa08-c11a9065235d': mariaGutierrez,
  '61cd9425-2d8e-456f-b228-f7e7c6a76e5d': robertChen,
  '3e4efd29-e7e4-4695-a1dc-6f3b0853c19d': sarahSmith
};
