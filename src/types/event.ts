export interface HackathonEvent {
  id: string;
  name: string;
  date: string;
  lumaEventLink: string;
  typeformRegistrationUrl: string;
  typeformSubmissionUrl: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateEventInput {
  name: string;
  date: string;
  lumaEventLink: string;
  typeformRegistrationUrl?: string;
  typeformSubmissionUrl?: string;
}
