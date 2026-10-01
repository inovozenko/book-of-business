import styles from './Avatar.module.scss';

export interface AvatarProps {
  /** Person's name. Used for the initials when there is no photo. */
  name: string;
  src?: string;
  size?: number;
}

/**
 * Round photo of a person, or their initials when there is no photo. Decorative: the
 * name is expected to be shown next to it, so the avatar is hidden from screen readers.
 */
export function Avatar({name, src, size = 20}: AvatarProps) {
  const style = {width: size, height: size};

  if (src) {
    return <img className={styles.avatar} src={src} alt="" width={size} height={size} style={style} />;
  }

  return (
    // The initials come from CSS so that they stay out of the text of the row.
    <span className={`${styles.avatar} ${styles.initials}`} data-initials={initials(name)} aria-hidden="true" style={{...style, fontSize: size * 0.4}} />
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words.at(-1)] : words;

  return letters.map((word) => word?.[0]?.toUpperCase() ?? '').join('');
}
