import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Database } from '../types/supabase';

// Environment variable checks and Supabase initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Zod schemas for validation
const EmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  content: z.string(),
  variables: z.array(z.string()),
});

const EmailCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  template_id: z.string(),
  status: z.string(),
  scheduled_at: z.string().optional(),
  target_audience: z.record(z.unknown())
});

const CampaignAnalyticsSchema = z.object({
  total_sent: z.number(),
  total_opened: z.number(),
  total_clicked: z.number(),
  total_converted: z.number(),
  total_unsubscribed: z.number(),
  total_revenue: z.number(),
});

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type EmailCampaign = z.infer<typeof EmailCampaignSchema>;
export type CampaignAnalytics = z.infer<typeof CampaignAnalyticsSchema>;

// Template Management
export const createEmailTemplate = async (template: Omit<EmailTemplate, 'id'>) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating email template:', error);
    throw error;
  }
};

export const getEmailTemplate = async (id: string): Promise<EmailTemplate> => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching email template:', error);
    throw error;
  }
};

// Analytics
export const getCampaignPerformance = async (campaignId: string): Promise<CampaignAnalytics> => {
  try {
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select(`
        count(CASE WHEN type = 'like' THEN 1 END) AS likes,
        count(CASE WHEN type = 'share' THEN 1 END) AS shares,
        count(CASE WHEN type = 'comment' THEN 1 END) AS comments,
        count(*) AS total_engagement
      `)
      .eq('campaign_id', campaignId)
      .single();

    if (error) throw error;

    const validationResult = CampaignAnalyticsSchema.safeParse(data);

    if (!validationResult.success) {
      console.error("Error parsing campaign analytics:", validationResult.error);
      throw validationResult.error;
    }

    const analytics = validationResult.data;

    const metrics: CampaignAnalytics = {
      total_sent: analytics.total_sent,
      total_opened: analytics.total_opened,
      total_clicked: analytics.total_clicked,
      total_converted: analytics.total_converted,
      total_unsubscribed: analytics.total_unsubscribed,
      total_revenue: analytics.total_revenue,
      open_rate: analytics.total_sent > 0 ? (analytics.total_opened / analytics.total_sent) * 100 : null,
      click_rate: analytics.total_sent > 0 ? (analytics.total_clicked / analytics.total_sent) * 100 : null,
      conversion_rate: analytics.total_sent > 0 ? (analytics.total_converted / analytics.total_sent) * 100 : null,
      unsubscribe_rate: analytics.total_sent > 0 ? (analytics.total_unsubscribed / analytics.total_sent) * 100 : null,
      revenue_per_recipient: analytics.total_sent > 0 ? analytics.total_revenue / analytics.total_sent : null
    };

    return metrics;

  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    throw error;
  }
};