package server

import (
	"strconv"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	cloudhub "github.com/snetsystems/cloudhub/backend"
	"github.com/snetsystems/cloudhub/backend/organizations"
)

type vsphereRequest struct {
	ID           string    `json:"id"`
	Host         string    `json:"host"`
	UserName     string    `json:"username"`
	Password     string    `json:"password"`
	Protocol     string    `json:"protocol"`
	Port         int       `json:"port"`
	Interval     int       `json:"interval"`
	Organization string    `json:"organization"`
	Minion       string    `json:"minion"`
	DataSource   string    `json:"datasource"`
}

func (r *vsphereRequest) ValidCreate() error {
	if r.Host == ""  {
		return fmt.Errorf("Host required vsphere request body")
	}
	if r.UserName == "" {
		return fmt.Errorf("UserName required vsphere request body")
	}
	if r.Password == "" {
		return fmt.Errorf("Password required vsphere request body")
	}
	if r.Interval == 0 {
		return fmt.Errorf("Interval required vsphere request body")
	}
	if r.Minion == "" {
		return fmt.Errorf("Minion required vsphere request body")
	}
	if r.DataSource == "" {
		return fmt.Errorf("DataSource required vsphere request body")
	}

	return nil
}

func (r *vsphereRequest) ValidUpdate() error {
	if r.Host == "" && r.UserName == "" && r.Password == "" &&
	 r.Protocol == "" && r.Port == 0 && r.Interval == 0 && r.Minion == "" && 
	 r.DataSource == "" {
		return fmt.Errorf("No fields to update")
	}

	return nil
}

type vsphereResponse struct {
	ID           string    `json:"id"`
	Host         string    `json:"host"`
	UserName     string    `json:"username"`
	Password     string    `json:"password"`
	Protocol     string    `json:"protocol"`
	Port         int       `json:"port"`
	Interval     int       `json:"interval"`
	Organization string    `json:"organization"`
	Minion       string    `json:"minion"`
	DataSource   string    `json:"datasource"`
	Links      selfLinks   `json:"links"`
}

func newVsphereResponse(v cloudhub.Vsphere) *vsphereResponse {
	selfLink := fmt.Sprintf("/cloudhub/v1/vspheres/%s", v.ID)

	return &vsphereResponse{
		ID:            v.ID,
		Host:          v.Host,
		UserName:      v.UserName,
		Password:      v.Password,
		Protocol:      v.Protocol,
		Port:          v.Port,
		Interval:      v.Interval,
		Minion:        v.Minion,
		Organization:  v.Organization,
		DataSource:    v.DataSource,
		Links: selfLinks{
			Self: selfLink,
		},
	}
}

type vspheresResponse struct {
	Links selfLinks             `json:"links"`
	Vspheres []*vsphereResponse `json:"vspheres"`
}

func newVspheresResponse(vspheres []cloudhub.Vsphere) *vspheresResponse {
	vspheresResp := make([]*vsphereResponse, len(vspheres))
	for i, vsphere := range vspheres {
		vspheresResp[i] = newVsphereResponse(vsphere)
	}

	selfLink := "/cloudhub/v1/vspheres"
	
	return &vspheresResponse{
		Vspheres: vspheresResp,
		Links: selfLinks{
			Self: selfLink,
		},
	}
}

// VsphereID returns a single specified vsphere
func (s *Service) VsphereID(w http.ResponseWriter, r *http.Request) {
	id, err := paramStr("id", r)
	if err != nil {
		Error(w, http.StatusUnprocessableEntity, err.Error(), s.Logger)
		return
	}

	ctx := r.Context()
	vs, err := s.Store.Vspheres(ctx).Get(ctx, id)
	if err != nil {
		notFound(w, id, s.Logger)
		return
	}

	res := newVsphereResponse(vs)
	encodeJSON(w, http.StatusOK, res, s.Logger)
}

// NewVsphere creates and returns a new vsphere object
func (s *Service) NewVsphere(w http.ResponseWriter, r *http.Request) {
	var req vsphereRequest
	var err error
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		invalidJSON(w, s.Logger)
		return
	}

	if err := req.ValidCreate(); err != nil {
		invalidData(w, err, s.Logger)
		return
	}

	ctx := r.Context()
	orgID, ok := sessionOrganization(ctx);
	if !ok {
		invalidData(w, fmt.Errorf("no organization information in session"), s.Logger)
		return
	}

	currentOrg, err := s.Store.Organizations(ctx).Get(ctx, cloudhub.OrganizationQuery{ID: &orgID})
	if err != nil {
		unknownErrorWithMessage(w, err, s.Logger)
		return
	}

	// validate that the vsphere host exists
	if vspheresExists(ctx, s, req.Host, currentOrg.ID) {
		invalidData(w, fmt.Errorf("vsphere host does existed in organization"), s.Logger)
		return
	}

	// datasource in organization
	if !hasSourcesOrganization(ctx, s, req.DataSource, currentOrg.ID) {
		invalidData(w, fmt.Errorf("datasource not does existed in organization"), s.Logger)
		return
	}

	vs := cloudhub.Vsphere{
		Host:          req.Host,
		UserName:      req.UserName,
		Password:      req.Password,
		Protocol:      req.Protocol,
		Port:          req.Port,
		Interval:      req.Interval,
		Minion:        req.Minion,
		Organization:  currentOrg.ID,
		DataSource:    req.DataSource,
	}

	res, err := s.Store.Vspheres(ctx).Add(ctx, vs)
	if err != nil {
		msg := fmt.Errorf("Error storing vsphere %v: %v", vs, err)
		unknownErrorWithMessage(w, msg, s.Logger)
		return
	}

	// log registrationte
	msg := fmt.Sprintf(MsgvSpheresCreated.String(), vs.Host)
	s.logRegistration(ctx, "vSpheres", msg)

	resVs := newVsphereResponse(res)
	location(w, resVs.Links.Self)
	encodeJSON(w, http.StatusCreated, resVs, s.Logger)
}

// RemoveVsphere deletes a vsphere
func (s *Service) RemoveVsphere(w http.ResponseWriter, r *http.Request) {
	id, err := paramStr("id", r)
	if err != nil {
		Error(w, http.StatusUnprocessableEntity, err.Error(), s.Logger)
		return
	}
	
	ctx := r.Context()
	vs, err := s.Store.Vspheres(ctx).Get(ctx, id)
	if err != nil {
		notFound(w, id, s.Logger)
		return
	}

	if err := s.Store.Vspheres(ctx).Delete(ctx, vs); err != nil {
		unknownErrorWithMessage(w, err, s.Logger)
		return
	}

	// log registrationte
	msg := fmt.Sprintf(MsgvSpheresDeleted.String(), vs.Host)
	s.logRegistration(ctx, "vSpheres", msg)

	w.WriteHeader(http.StatusNoContent)
}

// UpdateVsphere updates a vsphere
func (s *Service) UpdateVsphere(w http.ResponseWriter, r *http.Request) {
	var req vsphereRequest
	id, err := paramStr("id", r)
	if err != nil {
		msg := fmt.Sprintf("Could not parse vsphere ID: %s", err)
		Error(w, http.StatusInternalServerError, msg, s.Logger)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		invalidJSON(w, s.Logger)
		return
	}

	if err := req.ValidUpdate(); err != nil {
		invalidData(w, err, s.Logger)
		return
	}

	ctx := r.Context()
	orig, err := s.Store.Vspheres(ctx).Get(ctx, id)
	if err != nil {
		notFound(w, id, s.Logger)
		return
	}

	if req.Host != "" {
		orig.Host = req.Host
	}
	if req.UserName != "" {
		orig.UserName = req.UserName
	}
	if req.Password != "" {
		orig.Password = req.Password
	}
	if req.Protocol != "" {
		orig.Protocol = req.Protocol
	}
	if req.Port != 0 {
		orig.Port = req.Port
	}
	if req.Interval != 0 {
		orig.Interval = req.Interval
	}
	if req.Minion != "" {
		orig.Minion = req.Minion
	}
	if req.DataSource != "" {
		orig.DataSource = req.DataSource
	}

	orgID, ok := sessionOrganization(ctx);
	if !ok {
		invalidData(w, fmt.Errorf("no organization information in session"), s.Logger)
		return
	}

	currentOrg, err := s.Store.Organizations(ctx).Get(ctx, cloudhub.OrganizationQuery{ID: &orgID})
	if err != nil {
		unknownErrorWithMessage(w, err, s.Logger)
		return
	}

	orig.Organization = currentOrg.ID

	if req.Host != "" {
		// validate that the vsphere host exists
		if vspheresExists(ctx, s, req.Host, orig.Organization) {
			invalidData(w, fmt.Errorf("vsphere host does existed in organization"), s.Logger)
			return
		}
	}
	
	if req.DataSource != "" {
		if !hasSourcesOrganization(ctx, s, req.DataSource, orig.Organization) {
			invalidData(w, fmt.Errorf("datasource not does existed in organization"), s.Logger)
			return
		}
	}

	err = s.Store.Vspheres(ctx).Update(ctx, orig)
	if err != nil {
		msg := fmt.Sprintf("Error updating vsphere ID %s: %v", id, err)
		Error(w, http.StatusInternalServerError, msg, s.Logger)
		return
	}

	// log registrationte
	msg := fmt.Sprintf(MsgvSpheresModified.String(), orig.Host)
	s.logRegistration(ctx, "vSpheres", msg)

	res := newVsphereResponse(orig)
	location(w, res.Links.Self)
	encodeJSON(w, http.StatusOK, res, s.Logger)
}

// Vspheres returns all vspheres within the store
func (s *Service) Vspheres(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	vss, err := s.Store.Vspheres(ctx).All(ctx)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error(), s.Logger)
		return
	}

	res := newVspheresResponse(vss)
	encodeJSON(w, http.StatusOK, res, s.Logger)
}

func vspheresExists(ctx context.Context, s *Service, host string, orgID string) bool {
	vss, err := s.Store.Vspheres(ctx).All(ctx);
	if err != nil {
		return true
	}

	for _, vs := range vss {
		if vs.Host == host && vs.Organization == orgID {
			return true
		}
	}

	return false
}

func sessionOrganization(ctx context.Context) (string, bool) {
	orgID, ok := ctx.Value(organizations.ContextKey).(string)
	// should never happen
	if !ok {
		return "", false
	}
	if orgID == "" {
		return "", false
	}
	return orgID, true
}

func hasSourcesOrganization(ctx context.Context, s *Service, sourceID string, orgID string) bool {
	id, _ := strconv.Atoi(sourceID)
	src, err := s.Store.Sources(ctx).Get(ctx, id)
	if err != nil {
		return false
	}

	if src.Organization == orgID {
		return true
	}

	return false
}