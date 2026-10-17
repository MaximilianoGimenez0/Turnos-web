export interface DeveloperConfig {
  name: string;
  role: string;
  githubUrl: string;
  linkedinUrl: string;
}

export interface AppConfig {
  name: string;
  description: string;
}

export const DEVELOPER_INFO: DeveloperConfig = {
  name: 'Maximiliano Giménez',
  role: 'Full Stack Developer',
  githubUrl: 'https://github.com/MaximilianoGimenez0',
  linkedinUrl: 'https://www.linkedin.com/in/maximiliano-gim%C3%A9nez-2644b0338/',
};

export const APP_CONFIG: AppConfig = {
  name: 'TurnosWeb',
  description: 'Sistema integral de turnos online y cobro de señas automatizado.',
};
